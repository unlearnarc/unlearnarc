"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AlgorithmVisualizer: () => AlgorithmVisualizer,
  DEFAULT_STYLE_COLORS: () => DEFAULT_STYLE_COLORS,
  RENDERERS: () => RENDERERS,
  VisualizationEngine: () => VisualizationEngine,
  getRenderer: () => getRenderer,
  highlightMap: () => highlightMap,
  resolveTheme: () => resolveTheme,
  useVisualization: () => useVisualization
});
module.exports = __toCommonJS(index_exports);

// src/AlgorithmVisualizer.tsx
var import_react2 = require("react");

// src/core/types.ts
var DEFAULT_STYLE_COLORS = {
  COMPARE: "#f59e0b",
  SWAP: "#ef4444",
  VISIT: "#3b82f6",
  ACTIVE: "#22c55e",
  DONE: "#64748b",
  PATH: "#8b5cf6",
  ERROR: "#dc2626",
  INSERT: "#10b981",
  DELETE: "#f43f5e",
  PIVOT: "#eab308"
};

// src/renderers/shared.ts
function resolveTheme(theme) {
  return {
    background: theme?.background ?? "#0f172a",
    elementFill: theme?.elementFill ?? "#1e293b",
    elementStroke: theme?.elementStroke ?? "#475569",
    textColor: theme?.textColor ?? "#e2e8f0",
    font: theme?.font ?? "600 14px ui-sans-serif, system-ui, sans-serif",
    styleColors: { ...DEFAULT_STYLE_COLORS, ...theme?.styleColors ?? {} }
  };
}
function highlightMap(step, target, styleColors) {
  const map = /* @__PURE__ */ new Map();
  for (const h of step.highlights ?? []) {
    if (h.target !== target) continue;
    const color = styleColors[h.style] ?? "#888";
    for (const idx of h.indices ?? []) map.set(String(idx), color);
  }
  return map;
}

// src/renderers/arrayRenderer.ts
var renderArray = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const raw = step.state["array"] ?? step.state["values"] ?? [];
  const values = raw.map(
    (v) => typeof v === "object" && v !== null ? v.value ?? 0 : v
  );
  if (values.length === 0) return;
  const colors = highlightMap(step, "array", theme.styleColors);
  const pad = 24;
  const gap = 8;
  const cellW = Math.max(
    16,
    (width - pad * 2 - gap * (values.length - 1)) / values.length
  );
  const numeric = values.every((v) => typeof v === "number");
  const maxVal = numeric ? Math.max(...values, 1) : 1;
  const baseY = height - 48;
  const maxBarH = height - 120;
  ctx.font = theme.font;
  ctx.textAlign = "center";
  values.forEach((val, i) => {
    const x = pad + i * (cellW + gap);
    const barH = numeric ? Math.max(6, val / maxVal * maxBarH) : 40;
    const y = baseY - barH;
    const fill = colors.get(String(i)) ?? theme.elementFill;
    ctx.fillStyle = fill;
    ctx.strokeStyle = theme.elementStroke;
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, y, cellW, barH, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.textColor;
    ctx.fillText(String(val), x + cellW / 2, baseY + 16);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(String(i), x + cellW / 2, baseY + 32);
    const labels = pointerLabelsFor(step.pointers, i);
    if (labels.length) {
      ctx.fillStyle = theme.styleColors.ACTIVE ?? "#22c55e";
      ctx.fillText(labels.join(" "), x + cellW / 2, y - 10);
    }
  });
};
function pointerLabelsFor(pointers, index) {
  if (!pointers) return [];
  return Object.entries(pointers).filter(([, v]) => Number(v) === index).map(([k]) => k);
}
function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

// src/renderers/graphRenderer.ts
var renderGraph = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const nodes = step.state["nodes"] ?? [];
  const edges = step.state["edges"] ?? [];
  if (!nodes.length) return;
  const nodeColors = highlightMap(step, "nodes", theme.styleColors);
  const edgeColors = highlightMap(step, "edges", theme.styleColors);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;
  const pos = /* @__PURE__ */ new Map();
  nodes.forEach((n, i) => {
    const x = n.x ?? cx + radius * Math.cos(2 * Math.PI * i / nodes.length - Math.PI / 2);
    const y = n.y ?? cy + radius * Math.sin(2 * Math.PI * i / nodes.length - Math.PI / 2);
    pos.set(String(n.id), { x, y });
  });
  ctx.font = theme.font;
  ctx.textAlign = "center";
  edges.forEach((e, i) => {
    const a = pos.get(String(e.from));
    const b = pos.get(String(e.to));
    if (!a || !b) return;
    ctx.strokeStyle = edgeColors.get(String(i)) ?? theme.elementStroke;
    ctx.lineWidth = edgeColors.has(String(i)) ? 3 : 1.5;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    if (e.weight !== void 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(String(e.weight), (a.x + b.x) / 2, (a.y + b.y) / 2 - 4);
    }
  });
  const rNode = 20;
  nodes.forEach((n) => {
    const p = pos.get(String(n.id));
    ctx.fillStyle = nodeColors.get(String(n.id)) ?? theme.elementFill;
    ctx.strokeStyle = theme.elementStroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, rNode, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.textColor;
    ctx.fillText(String(n.label ?? n.id), p.x, p.y + 5);
  });
};

// src/renderers/stackRenderer.ts
var renderStack = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const values = step.state["stack"] ?? step.state["queue"] ?? step.state["items"] ?? [];
  const colors = highlightMap(step, "stack", theme.styleColors);
  const cellH = 34;
  const cellW = Math.min(220, width - 80);
  const x = (width - cellW) / 2;
  const baseY = height - 40;
  ctx.font = theme.font;
  ctx.textAlign = "center";
  values.forEach((val, i) => {
    const y = baseY - (i + 1) * (cellH + 6);
    ctx.fillStyle = colors.get(String(i)) ?? theme.elementFill;
    ctx.strokeStyle = theme.elementStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.rect(x, y, cellW, cellH);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = theme.textColor;
    ctx.fillText(String(val), x + cellW / 2, y + cellH / 2 + 5);
  });
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("top", x + cellW / 2, baseY - values.length * (cellH + 6) - 2);
};

// src/renderers/matrixRenderer.ts
var renderMatrix = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const matrix = step.state["matrix"] ?? [];
  if (!matrix.length) return;
  const rows = matrix.length;
  const cols = matrix[0].length;
  const pad = 24;
  const cell = Math.min(
    (width - pad * 2) / cols,
    (height - pad * 2) / rows,
    56
  );
  const ox = (width - cell * cols) / 2;
  const oy = (height - cell * rows) / 2;
  const cursor = step.state["cursor"];
  const visited = new Set(
    (step.state["visited"] ?? []).map(
      ([r, c]) => `${r},${c}`
    )
  );
  ctx.font = theme.font;
  ctx.textAlign = "center";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell;
      const y = oy + r * cell;
      let fill = theme.elementFill;
      if (visited.has(`${r},${c}`)) fill = theme.styleColors.VISIT ?? "#3b82f6";
      if (cursor && cursor[0] === r && cursor[1] === c)
        fill = theme.styleColors.ACTIVE ?? "#22c55e";
      ctx.fillStyle = fill;
      ctx.strokeStyle = theme.elementStroke;
      ctx.beginPath();
      ctx.rect(x, y, cell, cell);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = theme.textColor;
      ctx.fillText(String(matrix[r][c]), x + cell / 2, y + cell / 2 + 5);
    }
  }
};

// src/renderers/index.ts
var RENDERERS = {
  ARRAY: renderArray,
  STACK: renderStack,
  QUEUE: renderStack,
  GRAPH: renderGraph,
  TREE: renderGraph,
  MATRIX: renderMatrix
};
function getRenderer(type) {
  return RENDERERS[type] ?? renderArray;
}

// src/useVisualization.ts
var import_react = require("react");

// src/core/engine.ts
var VisualizationEngine = class {
  constructor(spec) {
    this.idToIndex = /* @__PURE__ */ new Map();
    this.listeners = /* @__PURE__ */ new Set();
    this.index = 0;
    this.playing = false;
    this.inputs = {};
    this.timer = null;
    this.speedMs = 900;
    this.spec = spec;
    spec.steps.forEach((s, i) => {
      if (s.id) this.idToIndex.set(s.id, i);
    });
  }
  // ── subscription ─────────────────────────────────────────────────────────
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }
  emit() {
    const snap = this.snapshot();
    this.listeners.forEach((l) => l(snap));
  }
  snapshot() {
    const step = this.spec.steps[this.index];
    const total = this.spec.steps.length;
    const pendingInput = step?.input && this.inputs[step.input.key] === void 0 ? step.input : void 0;
    return {
      index: this.index,
      total,
      step,
      isPlaying: this.playing,
      isFinished: this.index >= total - 1,
      pendingInput,
      inputs: { ...this.inputs }
    };
  }
  // ── step control ─────────────────────────────────────────────────────────
  next() {
    const snap = this.snapshot();
    if (snap.pendingInput) {
      this.pause();
      return;
    }
    if (this.index < this.spec.steps.length - 1) {
      this.index += 1;
      this.emit();
      if (this.playing) this.scheduleNext();
    } else {
      this.pause();
    }
  }
  prev() {
    if (this.index > 0) {
      this.index -= 1;
      this.emit();
    }
  }
  seek(index) {
    const clamped = Math.max(0, Math.min(index, this.spec.steps.length - 1));
    this.index = clamped;
    this.emit();
  }
  seekToStepId(id) {
    const idx = this.idToIndex.get(id);
    if (idx !== void 0) this.seek(idx);
  }
  reset() {
    this.pause();
    this.index = 0;
    this.inputs = {};
    this.emit();
  }
  // ── auto play ──────────────────────────────────────────────────────────────
  play() {
    if (this.playing) return;
    if (this.snapshot().pendingInput) return;
    this.playing = true;
    this.emit();
    this.scheduleNext();
  }
  pause() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    if (this.playing) {
      this.playing = false;
      this.emit();
    }
  }
  setSpeed(ms) {
    this.speedMs = Math.max(100, ms);
  }
  scheduleNext() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.next(), this.speedMs);
  }
  // ── user input ──────────────────────────────────────────────────────────────
  /**
   * Submit an answer for the current step's input request.
   * Returns true if the (optional) expected answer matched.
   * Handles CHOICE branching via option.nextStepId.
   */
  submitInput(value) {
    const step = this.spec.steps[this.index];
    const input = step?.input;
    if (!input) return { correct: null };
    this.inputs[input.key] = value;
    if (input.options) {
      const picked = input.options.find((o) => o.value === value);
      if (picked?.nextStepId) {
        this.emit();
        this.seekToStepId(picked.nextStepId);
        return { correct: this.evaluate(input, value) };
      }
    }
    this.emit();
    return { correct: this.evaluate(input, value) };
  }
  evaluate(input, value) {
    if (input.expected === void 0 || input.expected === null) return null;
    return input.expected == value;
  }
  dispose() {
    this.pause();
    this.listeners.clear();
  }
};

// src/useVisualization.ts
function useVisualization(spec) {
  const engine = (0, import_react.useMemo)(() => new VisualizationEngine(spec), [spec]);
  const [state, setState] = (0, import_react.useState)(() => engine.snapshot());
  const engineRef = (0, import_react.useRef)(engine);
  engineRef.current = engine;
  (0, import_react.useEffect)(() => {
    const unsub = engine.subscribe(setState);
    return () => {
      unsub();
      engine.dispose();
    };
  }, [engine]);
  const controls = (0, import_react.useMemo)(
    () => ({
      next: () => engineRef.current.next(),
      prev: () => engineRef.current.prev(),
      play: () => engineRef.current.play(),
      pause: () => engineRef.current.pause(),
      reset: () => engineRef.current.reset(),
      seek: (i) => engineRef.current.seek(i),
      setSpeed: (ms) => engineRef.current.setSpeed(ms),
      submitInput: (v) => engineRef.current.submitInput(v)
    }),
    []
  );
  return { state, controls };
}

// src/AlgorithmVisualizer.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function AlgorithmVisualizer({
  algorithm,
  theme,
  width = 640,
  height = 360,
  autoPlay = false,
  speedMs = 900,
  onInput,
  showCode = true,
  className
}) {
  const { state, controls } = useVisualization(algorithm.spec);
  const canvasRef = (0, import_react2.useRef)(null);
  const resolvedTheme = (0, import_react2.useMemo)(() => resolveTheme(theme), [theme]);
  const [lang, setLang] = (0, import_react2.useState)(
    algorithm.javaSource ? "java" : "python"
  );
  const [inputValue, setInputValue] = (0, import_react2.useState)("");
  (0, import_react2.useEffect)(() => {
    controls.setSpeed(speedMs);
    if (autoPlay) controls.play();
  }, []);
  (0, import_react2.useEffect)(() => {
    controls.setSpeed(speedMs);
  }, [speedMs, controls]);
  (0, import_react2.useEffect)(() => {
    const canvas = canvasRef.current;
    const step2 = state.step;
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
    if (!step2) return;
    try {
      const renderer = getRenderer(algorithm.spec.visualizer);
      renderer({ ctx, width, height, theme: th }, step2, algorithm.spec);
    } catch (err) {
      console.error("[AlgorithmVisualizer] render failed:", err);
      ctx.fillStyle = th.textColor;
      ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Unable to render this step.", width / 2, height / 2);
    }
  }, [state.index, state.step, width, height, algorithm.spec, resolvedTheme]);
  const step = state.step;
  const pending = state.pendingInput;
  const submit = (raw) => {
    const { correct } = controls.submitInput(raw);
    if (pending) onInput?.(pending.key, raw, correct);
    setInputValue("");
  };
  const sourceLines = ((lang === "java" ? algorithm.javaSource : algorithm.pythonSource) ?? "").split("\n");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className, style: styles.root, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.main, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", { ref: canvasRef, style: styles.canvas }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", { style: styles.side, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.stepTitle, children: step?.title ?? `Step ${state.index + 1}` }),
        step?.explanation && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: styles.explanation, children: step.explanation }),
        algorithm.spec.variables?.length ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.vars, children: algorithm.spec.variables.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.varRow, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: { ...styles.varDot, background: v.color ?? "#64748b" } }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.varName, children: v.label ?? v.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.varVal, children: String(step?.variables?.[v.name] ?? "\u2014") })
        ] }, v.name)) }) : null,
        pending && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.inputBox, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.prompt, children: pending.prompt }),
          pending.type === "CHOICE" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: styles.choices, children: pending.options?.map((o, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              style: styles.choiceBtn,
              onClick: () => submit(o.value),
              children: o.label
            },
            i
          )) }) : pending.type === "BOOLEAN" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.choices, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.choiceBtn, onClick: () => submit(true), children: "True" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.choiceBtn, onClick: () => submit(false), children: "False" })
          ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.choices, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                style: styles.input,
                type: pending.type === "NUMBER" ? "number" : "text",
                placeholder: pending.placeholder,
                value: inputValue,
                onChange: (e) => setInputValue(e.target.value)
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "button",
              {
                style: styles.choiceBtn,
                onClick: () => submit(
                  pending.type === "NUMBER" ? Number(inputValue) : inputValue
                ),
                children: "Submit"
              }
            )
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.controls, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.btn, onClick: controls.reset, children: "\u23EE" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.btn, onClick: controls.prev, disabled: state.index === 0, children: "\u25C0" }),
      state.isPlaying ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.btn, onClick: controls.pause, children: "\u23F8" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.btn, onClick: controls.play, disabled: !!pending, children: "\u25B6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: styles.btn, onClick: controls.next, disabled: state.isFinished || !!pending, children: "\u25B6\u25B6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "input",
        {
          type: "range",
          min: 0,
          max: Math.max(0, state.total - 1),
          value: state.index,
          onChange: (e) => controls.seek(Number(e.target.value)),
          style: styles.scrubber
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: styles.counter, children: [
        state.index + 1,
        " / ",
        state.total
      ] })
    ] }),
    showCode && (algorithm.javaSource || algorithm.pythonSource) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.codeWrap, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: styles.tabs, children: [
        algorithm.javaSource && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: lang === "java" ? styles.tabActive : styles.tab,
            onClick: () => setLang("java"),
            children: "Java"
          }
        ),
        algorithm.pythonSource && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "button",
          {
            style: lang === "python" ? styles.tabActive : styles.tab,
            onClick: () => setLang("python"),
            children: "Python"
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { style: styles.code, children: sourceLines.map((ln, i) => {
        const active = step?.line === i + 1 && (step?.lang ?? "java") === lang;
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            style: {
              ...styles.codeLine,
              background: active ? "rgba(34,197,94,0.18)" : "transparent"
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { style: styles.lineNo, children: i + 1 }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: ln || " " })
            ]
          },
          i
        );
      }) })
    ] })
  ] });
}
var styles = {
  root: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
    color: "var(--ua-text-on-dark, #e2e8f0)",
    fontFamily: "var(--ua-font-sans, ui-sans-serif, system-ui, sans-serif)"
  },
  main: { display: "flex", gap: 18, flexWrap: "wrap" },
  canvas: {
    borderRadius: "var(--ua-radius-lg, 14px)",
    border: "1px solid var(--ua-navy-700, #17345F)",
    background: "var(--ua-navy-900, #0B1B3A)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)"
  },
  side: { flex: 1, minWidth: 240, display: "flex", flexDirection: "column", gap: 12 },
  stepTitle: {
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: "-0.01em",
    color: "#f1f5f9"
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
    border: "1px solid rgba(255,255,255,0.08)"
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
    background: "rgba(65,105,225,0.10)"
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
    transition: "filter 0.15s ease"
  },
  input: {
    flex: 1,
    padding: "7px 12px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid var(--ua-navy-600, #214776)",
    background: "var(--ua-navy-900, #0B1B3A)",
    color: "#e2e8f0",
    fontSize: 13
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: "var(--ua-radius-md, 10px)",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)"
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 38,
    padding: "7px 12px",
    borderRadius: "var(--ua-radius-sm, 8px)",
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(255,255,255,0.06)",
    color: "#e2e8f0",
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.15s ease"
  },
  scrubber: { flex: 1, accentColor: "var(--ua-primary-500, #4169E1)" },
  counter: {
    fontSize: 12.5,
    fontWeight: 600,
    color: "#94a3b8",
    minWidth: 62,
    textAlign: "right",
    fontFamily: "var(--ua-font-mono, ui-monospace, monospace)"
  },
  codeWrap: {
    borderRadius: "var(--ua-radius-md, 10px)",
    border: "1px solid var(--ua-navy-700, #17345F)",
    overflow: "hidden",
    background: "var(--ua-navy-900, #0B1B3A)"
  },
  tabs: { display: "flex", borderBottom: "1px solid var(--ua-navy-700, #17345F)" },
  tab: {
    padding: "9px 18px",
    background: "transparent",
    color: "#94a3b8",
    border: "none",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  tabActive: {
    padding: "9px 18px",
    background: "rgba(65,105,225,0.14)",
    color: "#fff",
    border: "none",
    borderBottom: "2px solid var(--ua-primary-500, #4169E1)",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer"
  },
  code: {
    margin: 0,
    padding: "8px 0",
    fontSize: 12.5,
    lineHeight: 1.7,
    fontFamily: "var(--ua-font-mono, ui-monospace, monospace)",
    maxHeight: 280,
    overflow: "auto"
  },
  codeLine: { display: "flex", gap: 14, padding: "0 14px" },
  lineNo: { color: "#475569", userSelect: "none", minWidth: 26, textAlign: "right" }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AlgorithmVisualizer,
  DEFAULT_STYLE_COLORS,
  RENDERERS,
  VisualizationEngine,
  getRenderer,
  highlightMap,
  resolveTheme,
  useVisualization
});
