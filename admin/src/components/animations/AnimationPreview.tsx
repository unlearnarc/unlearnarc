import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  ListChecks,
  HelpCircle,
  Code2,
  StickyNote,
} from 'lucide-react';
import {
  resolveFrameAtTime,
  activeInstructionIndex,
  type AnimationTrace,
} from '../../types/animation';
import { renderFrame, resolveTheme } from './canvasDraw';
import { useAdminPlayback } from './useAdminPlayback';

/* =============================================================================
   AnimationPreview — admin-side read-only replay of an AnimationTrace.

   Reuses the exact interpolation + draw primitives shipped to students
   (resolveFrameAtTime + renderFrame + canvasDraw), so what an admin previews is
   pixel-identical to what a learner sees. High-DPI aware, responsive, and
   scrubbable. Surfaces instructions, checkpoints, code programs and notes so an
   author can verify every facet of a scene before publishing.
   ============================================================================= */

export interface AnimationPreviewProps {
  trace: AnimationTrace;
  width?: number;
  height?: number;
  autoPlay?: boolean;
  compact?: boolean;
  className?: string;
}

const SPEEDS = [0.5, 1, 2];

function fmt(ms: number): string {
  const s = ms / 1000;
  return `${s.toFixed(1)}s`;
}

export const AnimationPreview: React.FC<AnimationPreviewProps> = ({
  trace,
  width,
  height,
  autoPlay = false,
  compact = false,
  className = '',
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const theme = useMemo(() => resolveTheme(trace.theme), [trace.theme]);
  const playback = useAdminPlayback(trace, { autoPlay });
  const { timeRef, seekTick, state, controls } = playback;

  const aspect = trace.viewport.height / trace.viewport.width || 0.6;

  const [size, setSize] = useState({
    w: width ?? trace.viewport.width,
    h: height ?? trace.viewport.height,
  });

  useLayoutEffect(() => {
    if (width && height) {
      setSize({ w: width, h: height });
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = Math.max(240, Math.floor(el.clientWidth));
      const h = height ?? Math.round(w * aspect);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, aspect]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { w, h } = size;
    const sx = w / trace.viewport.width;
    const sy = h / trace.viewport.height;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);
    const frame = resolveFrameAtTime(trace, timeRef.current);
    renderFrame(ctx, frame, trace.viewport.width, trace.viewport.height, theme, {
      grid: true,
      caption: true,
    });
  }, [size, trace, timeRef, theme]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    draw();
  }, [size, draw]);

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  useEffect(() => {
    draw();
  }, [seekTick, draw]);

  const activeStep = activeInstructionIndex(trace.instructions, state.time);

  return (
    <div className={className}>
      {/* Canvas */}
      <div
        ref={wrapRef}
        className="relative rounded-xl border border-white/10 overflow-hidden"
        style={{ background: theme.background }}
      >
        <canvas ref={canvasRef} className="block max-w-full" role="img" aria-label={trace.title} />
      </div>

      {/* Toolbar */}
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/10 bg-surface-soft px-3 py-2">
        <button
          onClick={controls.stepBackward}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Step back"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={controls.toggle}
          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white transition"
          title={state.isPlaying ? 'Pause' : 'Play'}
        >
          {state.isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={controls.stepForward}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Step forward"
        >
          <SkipForward size={16} />
        </button>
        <button
          onClick={controls.reset}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          title="Restart"
        >
          <RotateCcw size={15} />
        </button>

        <input
          type="range"
          min={0}
          max={state.duration}
          step={1}
          value={Math.min(state.time, state.duration)}
          onChange={(e) => controls.seek(Number(e.target.value))}
          className="flex-1 h-1.5 accent-violet-500 cursor-pointer"
        />

        <span className="text-[11px] tabular-nums text-slate-400 w-20 text-right">
          {fmt(state.time)} / {fmt(state.duration)}
        </span>

        <select
          value={state.speed}
          onChange={(e) => controls.setSpeed(Number(e.target.value))}
          className="text-xs bg-surface-soft border border-white/10 rounded-lg px-1.5 py-1 text-slate-300"
          title="Speed"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}×
            </option>
          ))}
        </select>
      </div>

      {compact ? null : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {/* Instructions */}
          {!!trace.instructions?.length && (
            <section className="rounded-xl border border-white/10 bg-surface-soft p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <ListChecks size={14} className="text-violet-400" /> Instruction steps (
                {trace.instructions.length})
              </h4>
              <ol className="space-y-1.5">
                {trace.instructions.map((s, i) => (
                  <li
                    key={s.id}
                    className={`text-xs rounded-lg px-2.5 py-1.5 cursor-pointer transition ${
                      i === activeStep
                        ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                        : 'text-slate-400 hover:bg-white/5'
                    }`}
                    onClick={() => controls.seek(s.time)}
                  >
                    <span className="tabular-nums text-slate-500 mr-1.5">{fmt(s.time)}</span>
                    <span className="font-medium">{s.title}</span>
                    {s.detail && i === activeStep && (
                      <p className="mt-1 text-[11px] text-slate-400">{s.detail}</p>
                    )}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Checkpoints */}
          {!!trace.checkpoints?.length && (
            <section className="rounded-xl border border-white/10 bg-surface-soft p-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <HelpCircle size={14} className="text-amber-400" /> Checkpoints (
                {trace.checkpoints.length})
              </h4>
              <ul className="space-y-2">
                {trace.checkpoints.map((c) => (
                  <li key={c.id} className="text-xs rounded-lg bg-white/5 px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="tabular-nums text-slate-500">{fmt(c.time)}</span>
                      <span className="text-[10px] uppercase tracking-wide text-amber-400">
                        {c.kind}
                        {c.blocking ? ' · blocking' : ''}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300">{c.prompt}</p>
                    <button
                      onClick={() => controls.seek(Math.max(0, c.time - 1))}
                      className="mt-1.5 text-[10px] text-violet-400 hover:underline"
                    >
                      Jump to checkpoint
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Code programs */}
          {!!trace.programs?.length && (
            <section className="rounded-xl border border-white/10 bg-surface-soft p-3 lg:col-span-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <Code2 size={14} className="text-emerald-400" /> Attached programs (
                {trace.programs.length})
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {trace.programs.map((p) => (
                  <div key={p.id} className="rounded-lg border border-white/10 overflow-hidden">
                    <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/5 text-[11px]">
                      <span className="font-medium text-slate-200">{p.label}</span>
                      <span className="flex items-center gap-1.5">
                        <span className="uppercase text-slate-500">{p.language}</span>
                        {p.runnable && (
                          <span className="text-emerald-400 text-[9px] uppercase">runnable</span>
                        )}
                      </span>
                    </div>
                    <pre className="max-h-48 overflow-auto p-2.5 text-[11px] leading-relaxed text-slate-300 font-mono whitespace-pre">
                      {p.source.split('\n').map((line, i) => {
                        const ln = i + 1;
                        const active = activeCodeLinesFor(p, state.time).includes(ln);
                        return (
                          <div
                            key={ln}
                            className={active ? 'bg-emerald-500/20 -mx-2.5 px-2.5' : ''}
                          >
                            <span className="inline-block w-6 text-slate-600 select-none">{ln}</span>
                            {line || ' '}
                          </div>
                        );
                      })}
                    </pre>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notes */}
          {trace.notes && (
            <section className="rounded-xl border border-white/10 bg-surface-soft p-3 lg:col-span-2">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 mb-2">
                <StickyNote size={14} className="text-sky-400" /> Notes
              </h4>
              {trace.notes.summary && (
                <p className="text-xs text-slate-400 mb-2">{trace.notes.summary}</p>
              )}
              {!!trace.notes.whereToUse?.length && (
                <>
                  <p className="text-[11px] font-semibold text-slate-300 mt-2 mb-1">Where to use</p>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                    {trace.notes.whereToUse.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </>
              )}
              {!!trace.notes.keyPoints?.length && (
                <>
                  <p className="text-[11px] font-semibold text-slate-300 mt-2 mb-1">Key points</p>
                  <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                    {trace.notes.keyPoints.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

function activeCodeLinesFor(
  program: { highlights?: { time: number; lines: number[] }[] },
  time: number,
): number[] {
  const hs = program.highlights;
  if (!hs || hs.length === 0) return [];
  let current: { time: number; lines: number[] } | undefined;
  for (const h of hs) {
    if (h.time <= time) current = h;
    else break;
  }
  return current?.lines ?? [];
}
