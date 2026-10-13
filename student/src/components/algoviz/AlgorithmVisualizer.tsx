import { useEffect, useMemo, useRef, useState } from "react";
import {
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  Gauge,
} from "lucide-react";
import type { Algorithm, PlayerTheme } from "./core/types";
import { getRenderer, resolveTheme } from "./renderers";
import { useVisualization } from "./useVisualization";

export interface AlgorithmVisualizerProps {
  algorithm: Algorithm;
  theme?: PlayerTheme;
  width?: number;
  height?: number;
  /** Autostart playback on mount. */
  autoPlay?: boolean;
  /** ms per step for auto play. */
  speedMs?: number;
  /** Called every time the learner submits a step input. */
  onInput?: (key: string, value: unknown, correct: boolean | null) => void;
  /** Hide the built-in code panel if the host renders its own. */
  showCode?: boolean;
  className?: string;
}

/**
 * Self-contained canvas player for a meta-driven algorithm spec.
 *
 * Layout: [ canvas | narration+variables ] over [ transport controls ]
 *         with an optional code panel (Java/Python tabs) and inline input prompts.
 */
export function AlgorithmVisualizer({
  algorithm,
  theme,
  width = 640,
  height = 360,
  autoPlay = false,
  speedMs = 900,
  onInput,
  showCode = true,
  className,
}: AlgorithmVisualizerProps) {
  const { state, controls } = useVisualization(algorithm.spec);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Re-resolve whenever the theme prop changes so host-driven theming updates live.
  const resolvedTheme = useMemo(() => resolveTheme(theme), [theme]);
  const [lang, setLang] = useState<"java" | "python">(
    algorithm.javaSource ? "java" : "python"
  );
  const [inputValue, setInputValue] = useState<string>("");
  // Learner-controlled playback speed (ms per step). Seeded from the host prop.
  const [speed, setSpeed] = useState<number>(speedMs);

  useEffect(() => {
    controls.setSpeed(speed);
    if (autoPlay) controls.play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep playback speed in sync if the host changes the prop after mount.
  useEffect(() => {
    setSpeed(speedMs);
    controls.setSpeed(speedMs);
  }, [speedMs, controls]);

  // ── Draw current frame ──────────────────────────────────────────────────
  // Depend on state.index (a primitive) rather than state.step (a reference
  // that is stable across re-renders) so the canvas reliably redraws on every
  // navigation AND on the very first paint once the ref is attached.
  useEffect(() => {
    const canvas = canvasRef.current;
    const step = state.step;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const th = resolvedTheme;
    ctx.fillStyle = th.background;
    ctx.fillRect(0, 0, width, height);

    // No step yet (empty spec) → leave the cleared background.
    if (!step) return;

    try {
      const renderer = getRenderer(algorithm.spec.visualizer);
      renderer({ ctx, width, height, theme: th }, step, algorithm.spec);
    } catch (err) {
      // A malformed spec should never crash the host app.
      // eslint-disable-next-line no-console
      console.error("[AlgorithmVisualizer] render failed:", err);
      ctx.fillStyle = th.textColor;
      ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Unable to render this step.", width / 2, height / 2);
    }
  }, [state.index, state.step, width, height, algorithm.spec, resolvedTheme]);

  const step = state.step;
  const pending = state.pendingInput;

  const submit = (raw: unknown) => {
    const { correct } = controls.submitInput(raw);
    if (pending) onInput?.(pending.key, raw, correct);
    setInputValue("");
  };

  const sourceLines = (
    (lang === "java" ? algorithm.javaSource : algorithm.pythonSource) ?? ""
  ).split("\n");

  return (
    <div className={className} style={styles.root}>
      <div style={styles.main}>
        <canvas ref={canvasRef} style={styles.canvas} />

        <aside style={styles.side}>
          <div style={styles.stepTitle}>
            {step?.title ?? `Step ${state.index + 1}`}
          </div>
          {step?.explanation && (
            <p style={styles.explanation}>{step.explanation}</p>
          )}

          {algorithm.spec.variables?.length ? (
            <div style={styles.vars}>
              {algorithm.spec.variables.map((v) => (
                <div key={v.name} style={styles.varRow}>
                  <span style={{ ...styles.varDot, background: v.color ?? "#64748b" }} />
                  <span style={styles.varName}>{v.label ?? v.name}</span>
                  <span style={styles.varVal}>
                    {String(step?.variables?.[v.name] ?? "—")}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {pending && (
            <div style={styles.inputBox}>
              <div style={styles.prompt}>{pending.prompt}</div>
              {pending.type === "CHOICE" ? (
                <div style={styles.choices}>
                  {pending.options?.map((o, i) => (
                    <button
                      key={i}
                      style={styles.choiceBtn}
                      onClick={() => submit(o.value)}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              ) : pending.type === "BOOLEAN" ? (
                <div style={styles.choices}>
                  <button style={styles.choiceBtn} onClick={() => submit(true)}>True</button>
                  <button style={styles.choiceBtn} onClick={() => submit(false)}>False</button>
                </div>
              ) : (
                <div style={styles.choices}>
                  <input
                    style={styles.input}
                    type={pending.type === "NUMBER" ? "number" : "text"}
                    placeholder={pending.placeholder}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                  />
                  <button
                    style={styles.choiceBtn}
                    onClick={() =>
                      submit(
                        pending.type === "NUMBER" ? Number(inputValue) : inputValue
                      )
                    }
                  >
                    Submit
                  </button>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* transport */}
      <div style={styles.controls}>
        <button
          style={styles.btn}
          onClick={controls.reset}
          disabled={state.index === 0 && !state.isPlaying}
          title="Restart from the beginning"
          aria-label="Restart"
        >
          <SkipBack size={16} aria-hidden />
          <span style={styles.btnLabel}>Restart</span>
        </button>

        <button
          style={styles.btn}
          onClick={controls.prev}
          disabled={state.index === 0}
          title="Go to the previous step"
          aria-label="Previous step"
        >
          <ChevronLeft size={16} aria-hidden />
          <span style={styles.btnLabel}>Prev</span>
        </button>

        {state.isPlaying ? (
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={controls.pause}
            title="Pause the animation"
            aria-label="Pause"
          >
            <Pause size={16} aria-hidden />
            <span style={styles.btnLabel}>Pause</span>
          </button>
        ) : (
          <button
            style={{ ...styles.btn, ...styles.btnPrimary }}
            onClick={controls.play}
            disabled={!!pending || state.isFinished}
            title={
              pending
                ? "Answer the question to continue"
                : state.isFinished
                ? "Reached the end — press Restart to replay"
                : "Play the animation automatically"
            }
            aria-label="Play"
          >
            <Play size={16} aria-hidden />
            <span style={styles.btnLabel}>Play</span>
          </button>
        )}

        <button
          style={styles.btn}
          onClick={controls.next}
          disabled={state.isFinished || !!pending}
          title={
            pending
              ? "Answer the question to continue"
              : "Advance one step forward"
          }
          aria-label="Next step"
        >
          <ChevronRight size={16} aria-hidden />
          <span style={styles.btnLabel}>Next</span>
        </button>

        <div style={styles.scrubberWrap}>
          <input
            type="range"
            min={0}
            max={Math.max(0, state.total - 1)}
            value={state.index}
            onChange={(e) => controls.seek(Number(e.target.value))}
            style={styles.scrubber}
            title="Drag to jump to any step"
            aria-label="Step timeline"
          />
          <span style={styles.counter}>
            Step {state.index + 1} / {state.total}
          </span>
        </div>

        <label style={styles.speedWrap} title="Animation speed">
          <Gauge size={15} aria-hidden style={{ color: "#94a3b8" }} />
          <select
            style={styles.speedSelect}
            value={speed}
            onChange={(e) => {
              const ms = Number(e.target.value);
              setSpeed(ms);
              controls.setSpeed(ms);
            }}
            aria-label="Animation speed"
          >
            <option value={1600}>0.5×</option>
            <option value={900}>1×</option>
            <option value={450}>2×</option>
            <option value={200}>4×</option>
          </select>
        </label>
      </div>

      {/* code panel */}
      {showCode && (algorithm.javaSource || algorithm.pythonSource) && (
        <div style={styles.codeWrap}>
          <div style={styles.tabs}>
            {algorithm.javaSource && (
              <button
                style={lang === "java" ? styles.tabActive : styles.tab}
                onClick={() => setLang("java")}
              >Java</button>
            )}
            {algorithm.pythonSource && (
              <button
                style={lang === "python" ? styles.tabActive : styles.tab}
                onClick={() => setLang("python")}
              >Python</button>
            )}
          </div>
          <pre style={styles.code}>
            {sourceLines.map((ln, i) => {
              const active =
                step?.line === i + 1 && (step?.lang ?? "java") === lang;
              return (
                <div
                  key={i}
                  style={{
                    ...styles.codeLine,
                    background: active ? "rgba(34,197,94,0.18)" : "transparent",
                  }}
                >
                  <span style={styles.lineNo}>{i + 1}</span>
                  <code>{ln || " "}</code>
                </div>
              );
            })}
          </pre>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "var(--ua-text-on-dark, #e2e8f0)",
    fontFamily: "var(--ua-font-sans, ui-sans-serif, system-ui, sans-serif)",
  },
  main: { display: "flex", gap: 18, flexWrap: "wrap" },
  canvas: {
    borderRadius: "var(--ua-radius-lg, 14px)",
    border: "1px solid var(--ua-navy-700, #17345F)",
    background: "var(--ua-navy-900, #0B1B3A)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  },
  side: { flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 12 },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    color: "#f1f5f9",
  },
  explanation: { fontSize: 13.5, lineHeight: 1.6, color: "var(--ua-text-on-dark, #cbd5e1)", margin: 0 },
  vars: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginTop: 4,
    padding: 12,
    borderRadius: "var(--ua-radius-md, 10px)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  varRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 13 },
  varDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  varName: { color: "#94a3b8", minWidth: 64 },
  varVal: { fontWeight: 700, fontFamily: "var(--ua-font-mono, ui-monospace, monospace)", color: "#e2e8f0" },
  inputBox: {
    marginTop: 4,
    padding: 14,
    borderRadius: "var(--ua-radius-md, 10px)",
    border: "1px solid var(--ua-primary-600, #3157D5)",
    background: "rgba(65,105,225,0.10)",
  },
  prompt: { fontSize: 13.5, fontWeight: 600, marginBottom: 10, color: "#e2e8f0" },
  choices: { display: "flex", gap: 8, flexWrap: "wrap" },
  choiceBtn: {
    padding: "7px 14px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid var(--ua-primary-500, #4169E1)",
    background: "var(--ua-primary-500, #4169E1)",
    color: "#fff",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    transition: "filter 0.15s ease",
  },
  input: {
    flex: 1,
    padding: "7px 12px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid var(--ua-navy-600, #214776)",
    background: "var(--ua-navy-900, #0B1B3A)",
    color: "#e2e8f0",
    fontSize: 13,
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: "var(--ua-radius-md, 10px)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    flexWrap: "wrap",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 38,
    padding: "7px 12px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
    transition: "background 0.15s ease, filter 0.15s ease",
  },
  btnPrimary: {
    background: "var(--ua-primary-500, #4169E1)",
    border: "1px solid var(--ua-primary-500, #4169E1)",
    color: "#fff",
    minWidth: 92,
  },
  btnLabel: { lineHeight: 1 },
  scrubberWrap: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 180,
  },
  scrubber: { flex: 1, accentColor: "var(--ua-primary-500, #4169E1)", cursor: "pointer" },
  counter: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#94a3b8",
    minWidth: 92,
    textAlign: "right",
    fontFamily: "var(--ua-font-mono, ui-monospace, monospace)",
  },
  speedWrap: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    paddingLeft: 4,
  },
  speedSelect: {
    padding: "6px 8px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  codeWrap: {
    borderRadius: "var(--ua-radius-md, 10px)",
    border: "1px solid var(--ua-navy-700, #17345F)",
    overflow: "hidden",
    background: "var(--ua-navy-900, #0B1B3A)",
  },
  tabs: { display: "flex", borderBottom: "1px solid var(--ua-navy-700, #17345F)" },
  tab: {
    padding: "9px 18px",
    background: "transparent",
    color: "#94a3b8",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  tabActive: {
    padding: "9px 18px",
    background: "rgba(65,105,225,0.14)",
    color: "#fff",
    border: "none",
    borderBottom: "2px solid var(--ua-primary-500, #4169E1)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  code: {
    margin: 0,
    padding: "8px 0",
    fontSize: 12.5,
    lineHeight: 1.7,
    fontFamily: "var(--ua-font-mono, ui-monospace, monospace)",
    maxHeight: 280,
    overflow: "auto",
  },
  codeLine: { display: "flex", gap: 14, padding: "0 14px" },
  lineNo: { color: "#475569", userSelect: "none", minWidth: 26, textAlign: "right" },
};
