import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  resolveFrameAtTime,
  type AnimationTrace,
} from '../../types/animation';
import {
  renderFrame,
  resolveTheme,
  type ResolvedTheme,
} from './canvasDraw';
import {
  usePlaybackController,
  type PlaybackHandle,
} from './usePlaybackController';
import { AnimationToolbar } from './AnimationToolbar';
import { CheckpointPrompt } from './CheckpointPrompt';
import { InstructionRail } from './InstructionRail';
import { AnimationNotesPanel } from './AnimationNotesPanel';
import { CodeProgramPanel } from './CodeProgramPanel';
import { AnimationFocus } from '../ui/AnimationFocus';

/* =============================================================================
   CanvasAnimator — declarative React wrapper around an HTML5 <canvas> driven by
   a time-based playback controller and a lerp interpolation loop.

   DESIGN
   ------
   • High-DPI aware: the backing store is sized to logical size × devicePixelRatio
     and the 2D context is scaled, so lines/text stay crisp on Retina.
   • Responsive: a ResizeObserver tracks the container; the drawing surface keeps
     the trace's viewport aspect ratio and scales its contents to fit.
   • Zero per-frame React state: the RAF loop reads `timeRef` directly and draws.
     The only React re-renders come from the throttled toolbar read-out.
   • Pluggable renderer: `renderFn` lets a scene swap in a custom draw routine
     (or a WebGL/Pixi backend later) while reusing playback + interpolation.
   ============================================================================= */

export interface CanvasAnimatorProps {
  traceData: AnimationTrace;
  /** Fixed logical width/height. Omit to fill the container responsively. */
  width?: number;
  height?: number;
  autoPlay?: boolean;
  initialSpeed?: number;
  showToolbar?: boolean;
  showGrid?: boolean;
  showCaption?: boolean;
  /** Show the time-synced step-by-step instruction rail (when the trace has steps). */
  showInstructions?: boolean;
  /** Show the general "about / where to use" notes panel (when the trace has notes). */
  showNotes?: boolean;
  /** Enable mid-animation checkpoint questions (when the trace has checkpoints). */
  enableCheckpoints?: boolean;
  /** Show the code program panel (when the trace has programs). */
  showCode?: boolean;
  className?: string;
  /** Override the full-scene draw routine (custom scenes). */
  renderFn?: (
    ctx: CanvasRenderingContext2D,
    frame: ReturnType<typeof resolveFrameAtTime>,
    dims: { width: number; height: number },
    theme: ResolvedTheme,
  ) => void;
  /** Exposes the playback controller so a parent can mount external controls. */
  onReady?: (handle: PlaybackHandle) => void;
}

export const CanvasAnimator: React.FC<CanvasAnimatorProps> = ({
  traceData,
  width,
  height,
  autoPlay = false,
  initialSpeed = 1,
  showToolbar = true,
  showGrid = true,
  showCaption = true,
  showInstructions = true,
  showNotes = true,
  enableCheckpoints = true,
  showCode = true,
  className,
  renderFn,
  onReady,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const theme = useMemo(() => resolveTheme(traceData.theme), [traceData.theme]);
  const playback = usePlaybackController(traceData, { autoPlay, initialSpeed });
  const { timeRef, seekTick } = playback;

  const aspect = traceData.viewport.height / traceData.viewport.width || 0.6;

  // ── responsive logical size ───────────────────────────────────────────────
  const [size, setSize] = useState({
    w: width ?? traceData.viewport.width,
    h: height ?? traceData.viewport.height,
  });

  useLayoutEffect(() => {
    if (width && height) {
      setSize({ w: width, h: height });
      return;
    }
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const focused = !!el.closest('.is-expanded');
      const availableWidth = Math.max(1, Math.floor(el.clientWidth) - 2);
      const w = focused ? Math.min(availableWidth, Math.max(1, el.clientHeight - 2) / aspect) : availableWidth;
      const h = focused ? Math.round(w * aspect) : height ?? Math.round(w * aspect);
      setSize({ w, h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, aspect]);

  useEffect(() => {
    onReady?.(playback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── the single draw function (scales trace viewport → canvas size) ────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w, h } = size;
    const sx = w / traceData.viewport.width;
    const sy = h / traceData.viewport.height;

    const dpr = window.devicePixelRatio || 1;
    // Reset transform, then apply DPR + viewport scale together.
    ctx.setTransform(dpr * sx, 0, 0, dpr * sy, 0, 0);

    const frame = resolveFrameAtTime(traceData, timeRef.current);
    const dims = {
      width: traceData.viewport.width,
      height: traceData.viewport.height,
    };

    if (renderFn) {
      // custom scenes paint their own background
      renderFn(ctx, frame, dims, theme);
    } else {
      renderFrame(ctx, frame, dims.width, dims.height, theme, {
        grid: showGrid,
        caption: showCaption,
      });
    }
  }, [size, traceData, timeRef, theme, renderFn, showGrid, showCaption]);

  // ── keep the backing store sized for the current DPR + logical size ───────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size.w * dpr);
    canvas.height = Math.round(size.h * dpr);
    canvas.style.width = `${size.w}px`;
    canvas.style.height = `${size.h}px`;
    draw(); // immediate repaint after a resize
  }, [size, draw]);

  // ── continuous render loop: always draws, so playing + idle both stay crisp ─
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      draw();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  // ── redraw once after a paused seek (loop handles the playing case) ───────
  useEffect(() => {
    draw();
  }, [seekTick, draw]);

  const hasInstructions =
    showInstructions && !!traceData.instructions?.length;
  const hasNotes = showNotes && !!traceData.notes;
  const hasCode = showCode && !!traceData.programs?.length;
  const activeCp = enableCheckpoints ? playback.state.activeCheckpoint : null;

  return (
    <div className={`ua-animation-player ${className ?? ''}`}>
      <AnimationFocus title={traceData.title}>
      <div className={`ua-animation-layout ${hasInstructions ? 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_260px]' : ''}`}>
        <div className="min-w-0">
          <div
            ref={wrapRef}
            className="ua-animation-canvas relative rounded-2xl border border-border overflow-hidden"
            style={{ background: theme.background }}
          >
            <canvas
              ref={canvasRef}
              className="block max-w-full"
              role="img"
              aria-label={traceData.title}
            />
            {activeCp && (
              <CheckpointPrompt
                checkpoint={activeCp}
                controls={playback.controls}
              />
            )}
          </div>

          {showToolbar && (
            <AnimationToolbar
              state={playback.state}
              controls={playback.controls}
              className="mt-3"
            />
          )}

          {hasCode && (
            <CodeProgramPanel
              programs={traceData.programs!}
              time={playback.state.time}
              className="ua-animation-secondary mt-3"
            />
          )}
        </div>

        {hasInstructions && (
          <InstructionRail
            steps={traceData.instructions!}
            time={playback.state.time}
            controls={playback.controls}
            className="ua-animation-secondary self-start"
          />
        )}
      </div>

      {hasNotes && <AnimationNotesPanel notes={traceData.notes!} className="ua-animation-secondary mt-3" />}
      </AnimationFocus>
    </div>
  );
};
