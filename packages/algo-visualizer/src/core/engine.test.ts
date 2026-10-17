import { afterEach, describe, expect, it, vi } from 'vitest';
import { VisualizationEngine } from './engine';
import type { VisualizationSpec } from './types';

const spec = { steps: [{ id: 'start' }, { id: 'middle' }, { id: 'end' }] } as VisualizationSpec;
afterEach(() => vi.useRealTimers());

describe('VisualizationEngine', () => {
  it('clamps navigation, seeks by id and resets', () => {
    const engine = new VisualizationEngine(spec);
    engine.prev();
    expect(engine.snapshot().index).toBe(0);
    engine.next();
    expect(engine.snapshot().index).toBe(1);
    engine.seek(100);
    expect(engine.snapshot().isFinished).toBe(true);
    engine.seek(-10);
    expect(engine.snapshot().index).toBe(0);
    engine.seekToStepId('middle');
    expect(engine.snapshot().index).toBe(1);
    engine.seekToStepId('absent');
    expect(engine.snapshot().index).toBe(1);
    engine.reset();
    expect(engine.snapshot().index).toBe(0);
    engine.dispose();
  });
  it('autoplays using controlled timers and stops after disposal', () => {
    vi.useFakeTimers();
    const engine = new VisualizationEngine(spec);
    engine.setSpeed(100);
    engine.play();
    vi.advanceTimersByTime(100);
    expect(engine.snapshot().index).toBe(1);
    engine.pause();
    vi.advanceTimersByTime(1000);
    expect(engine.snapshot().index).toBe(1);
    engine.play();
    vi.advanceTimersByTime(200);
    expect(engine.snapshot().isFinished).toBe(true);
    expect(engine.snapshot().isPlaying).toBe(false);
    engine.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('blocks on input, evaluates answers, branches and clears answers on reset', () => {
    const engine = new VisualizationEngine({ steps: [
      { id: 'question', input: { key: 'answer', type: 'CHOICE', expected: 5,
        options: [{ value: '5', nextStepId: 'finish', label: 'Five' }] } },
      { id: 'skip' }, { id: 'finish' },
    ] } as VisualizationSpec);
    engine.play();
    engine.next();
    expect(engine.snapshot().index).toBe(0);
    expect(engine.snapshot().isPlaying).toBe(false);
    expect(engine.submitInput('5')).toEqual({ correct: true });
    expect(engine.snapshot().index).toBe(2);
    expect(engine.snapshot().inputs).toEqual({ answer: '5' });
    engine.reset();
    expect(engine.snapshot().pendingInput?.key).toBe('answer');
    expect(engine.snapshot().inputs).toEqual({});
    engine.dispose();
  });
  it('notifies subscribers and supports unsubscribe', () => {
    const engine = new VisualizationEngine(spec);
    const listener = vi.fn();
    const unsubscribe = engine.subscribe(listener);
    engine.next();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    engine.next();
    expect(listener).toHaveBeenCalledTimes(2);
    engine.dispose();
  });
});
