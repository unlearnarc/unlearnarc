import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SandboxClient } from './SandboxClient';
import type { WorkerRequest, WorkerResponse } from './types';

class MockWorker {
  static instances: MockWorker[] = [];
  onmessage?: (event: { data: WorkerResponse }) => void;
  onerror?: (event: { message: string }) => void;
  onmessageerror?: () => void;
  postMessage = vi.fn<(message: WorkerRequest) => void>();
  terminate = vi.fn();
  constructor() { MockWorker.instances.push(this); }
  emit(data: WorkerResponse) { this.onmessage?.({ data }); }
}

let client: SandboxClient;
async function boot() {
  const ready = client.init('javascript');
  const worker = MockWorker.instances.at(-1)!;
  worker.emit({ type: 'READY', language: 'javascript' });
  await ready;
  return worker;
}
function runId(worker: MockWorker) {
  const request = worker.postMessage.mock.calls.at(-1)![0];
  if (request.type !== 'RUN') throw new Error('Expected RUN');
  return request.runId;
}

describe('SandboxClient lifecycle and error protocol', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker);
    client = new SandboxClient();
  });
  afterEach(() => { client.dispose(); vi.useRealTimers(); vi.unstubAllGlobals(); });

  it('returns an initialization failure instead of throwing before init', async () => {
    expect(await client.run('')).toMatchObject({ ok: false, errorDetails: { kind: 'initialization' } });
  });

  it('resolves pending startup runs and permits retry after init failure', async () => {
    const ready = client.init('javascript');
    const worker = MockWorker.instances[0];
    const run = client.run('');
    worker.emit({ type: 'INIT_ERROR', error: 'Download failed' });
    await expect(ready).rejects.toThrow('Download failed');
    expect(await run).toMatchObject({ ok: false, errorDetails: { kind: 'initialization' } });
    await boot();
  });

  it('preserves structured syntax failures and clears the timeout', async () => {
    const worker = await boot();
    const result = client.run('const =');
    await Promise.resolve();
    worker.emit({ type: 'RESULT', runId: runId(worker), ok: false, stdout: '', stderr: 'SyntaxError: invalid\n', error: 'SyntaxError: invalid', errorDetails: { kind: 'syntax', name: 'SyntaxError', message: 'invalid' }, durationMs: 2 });
    expect(await result).toMatchObject({ ok: false, timedOut: false, errorDetails: { kind: 'syntax' } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('settles a crashed worker with partial output', async () => {
    const worker = await boot();
    const result = client.run('');
    await Promise.resolve();
    worker.emit({ type: 'STDOUT', runId: runId(worker), chunk: 'before\n' });
    worker.onerror?.({ message: 'Worker crashed' });
    expect(await result).toMatchObject({ stdout: 'before\n', errorDetails: { kind: 'worker' } });
    expect(vi.getTimerCount()).toBe(0);
    await boot();
  });

  it('settles cancellation rather than losing a promise', async () => {
    await boot();
    const result = client.run('');
    await Promise.resolve();
    client.dispose();
    expect(await result).toMatchObject({ errorDetails: { kind: 'cancelled' } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('hard times out, retains streamed output and restarts the runtime', async () => {
    const worker = await boot();
    const result = client.run('while(true) {}', { timeoutMs: 100 });
    await Promise.resolve();
    worker.emit({ type: 'STDOUT', runId: runId(worker), chunk: 'before\n' });
    await vi.advanceTimersByTimeAsync(600);
    expect(await result).toMatchObject({ timedOut: true, stdout: 'before\n', errorDetails: { kind: 'timeout' } });
    expect(worker.terminate).toHaveBeenCalled();
    expect(MockWorker.instances).toHaveLength(2);
  });

  it('recognizes worker-side timeout and replaces its possibly running VM', async () => {
    const worker = await boot();
    const result = client.run('');
    await Promise.resolve();
    worker.emit({ type: 'RESULT', runId: runId(worker), ok: false, stdout: '', stderr: 'timeout', durationMs: 100, timedOut: true });
    expect(await result).toMatchObject({ timedOut: true });
    expect(worker.terminate).toHaveBeenCalled();
  });

  it('rejects overlapping execution without disturbing the first run', async () => {
    await boot();
    const first = client.run('');
    await Promise.resolve();
    expect(await client.run('')).toMatchObject({ ok: false, error: expect.stringContaining('already running') });
    client.dispose();
    await first;
  });
});
