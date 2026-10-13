/* =============================================================================
   canvasDraw — low-level Canvas 2D drawing primitives for the animation engine.
   -----------------------------------------------------------------------------
   Pure drawing functions kept out of the React component so they can be unit
   tested with a mock CanvasRenderingContext2D and reused by a future
   PixiJS/WebGL backend (same ResolvedFrame input).
   ============================================================================= */

import type {
  AnimationTheme,
  ConnectionState,
  EntityState,
  ResolvedFrame,
} from '../../types/animation';

export interface ResolvedTheme {
  background: string;
  gridColor: string;
  textColor: string;
  mutedTextColor: string;
  font: string;
  statusColors: Record<string, string>;
  tokens: Record<string, string>;
}

const DEFAULT_STATUS_COLORS: Record<string, string> = {
  IDLE: '#64748B',
  ACTIVE: '#2563EB',
  LOCKED: '#F59E0B',
  WAITING: '#94A3B8',
  SUCCESS: '#16A34A',
  FAILED: '#DC2626',
  RETRY: '#D97706',
  DONE: '#0F766E',
};

export function resolveTheme(theme?: AnimationTheme): ResolvedTheme {
  return {
    background: theme?.background ?? '#0F172A',
    gridColor: theme?.gridColor ?? 'rgba(148,163,184,0.08)',
    textColor: theme?.textColor ?? '#F1F5F9',
    mutedTextColor: theme?.mutedTextColor ?? '#94A3B8',
    font: theme?.font ?? 'ui-sans-serif, system-ui, sans-serif',
    statusColors: { ...DEFAULT_STATUS_COLORS, ...(theme?.statusColors ?? {}) },
    tokens: {
      primary: '#2563EB',
      success: '#16A34A',
      danger: '#DC2626',
      warning: '#F59E0B',
      muted: '#64748B',
      ...(theme?.tokens ?? {}),
    },
  };
}

/** Resolve an entity's fill: explicit color token > status color > fallback. */
function entityColor(e: EntityState, theme: ResolvedTheme): string {
  if (e.color) return theme.tokens[e.color] ?? e.color;
  if (e.status && theme.statusColors[e.status]) return theme.statusColors[e.status];
  return theme.tokens.primary;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Clears and paints the background + subtle grid. */
export function paintBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ResolvedTheme,
  grid = true,
) {
  ctx.fillStyle = theme.background;
  ctx.fillRect(0, 0, width, height);
  if (!grid) return;
  ctx.strokeStyle = theme.gridColor;
  ctx.lineWidth = 1;
  const gap = 40;
  ctx.beginPath();
  for (let x = gap; x < width; x += gap) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
  }
  for (let y = gap; y < height; y += gap) {
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  ctx.stroke();
}

const BOX_SHAPES = new Set(['rect', 'pill', 'cylinder', 'matrix', 'table', 'packet', 'arrayCell']);

function entityCenter(e: EntityState): { cx: number; cy: number } {
  if (e.shape && BOX_SHAPES.has(e.shape)) {
    return { cx: e.x + (e.width ?? 0) / 2, cy: e.y + (e.height ?? 0) / 2 };
  }
  return { cx: e.x, cy: e.y };
}

export function drawConnection(
  ctx: CanvasRenderingContext2D,
  conn: ConnectionState,
  byId: Map<string, EntityState>,
  theme: ResolvedTheme,
) {
  const from = byId.get(conn.from);
  const to = byId.get(conn.to);
  if (!from || !to) return;
  const a = entityCenter(from);
  const b = entityCenter(to);
  const color = conn.color ? theme.tokens[conn.color] ?? conn.color : theme.mutedTextColor;

  ctx.save();
  ctx.globalAlpha = conn.opacity ?? 1;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  if (conn.dashed) ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(a.cx, a.cy);
  ctx.lineTo(b.cx, b.cy);
  ctx.stroke();
  ctx.setLineDash([]);

  // Travelling packet along the link.
  if (conn.progress !== undefined) {
    const px = a.cx + (b.cx - a.cx) * conn.progress;
    const py = a.cy + (b.cy - a.cy) * conn.progress;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (conn.label) {
    ctx.fillStyle = theme.mutedTextColor;
    ctx.font = `11px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.fillText(conn.label, (a.cx + b.cx) / 2, (a.cy + b.cy) / 2 - 6);
  }
  ctx.restore();
}

/**
 * Draw a numeric grid (DP table / ML matrix). Reads meta:
 *   rows: number, cols: number, values: (string|number)[][],
 *   highlight?: [r,c][]  — cells to accent
 */
function drawMatrix(
  ctx: CanvasRenderingContext2D,
  e: EntityState,
  theme: ResolvedTheme,
  color: string,
) {
  const rows = Number(e.meta?.rows ?? 0);
  const cols = Number(e.meta?.cols ?? 0);
  if (rows <= 0 || cols <= 0) return;
  const values = (e.meta?.values as (string | number)[][]) ?? [];
  const highlight = (e.meta?.highlight as [number, number][]) ?? [];
  const hiSet = new Set(highlight.map(([r, c]) => `${r}:${c}`));
  const w = e.width ?? cols * 44;
  const h = e.height ?? rows * 44;
  const cw = w / cols;
  const ch = h / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = e.x + c * cw;
      const y = e.y + r * ch;
      ctx.fillStyle = hiSet.has(`${r}:${c}`) ? color : 'rgba(255,255,255,0.05)';
      ctx.fillRect(x, y, cw - 2, ch - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cw - 2, ch - 2);
      const v = values[r]?.[c];
      if (v !== undefined && v !== null) {
        ctx.fillStyle = theme.textColor;
        ctx.font = `600 12px ${theme.font}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(v), x + (cw - 2) / 2, y + (ch - 2) / 2);
      }
    }
  }
}

/**
 * Draw a titled SQL/record table. Reads meta:
 *   title?: string, columns: string[], rows: (string|number)[][],
 *   highlightRow?: number
 */
function drawTable(
  ctx: CanvasRenderingContext2D,
  e: EntityState,
  theme: ResolvedTheme,
  color: string,
) {
  const columns = (e.meta?.columns as string[]) ?? [];
  const rows = (e.meta?.rows as (string | number)[][]) ?? [];
  if (columns.length === 0) return;
  const title = e.meta?.title as string | undefined;
  const highlightRow = e.meta?.highlightRow as number | undefined;
  const w = e.width ?? columns.length * 90;
  const headerH = 26;
  const rowH = 24;
  const titleH = title ? 24 : 0;
  const cw = w / columns.length;

  // title bar
  if (title) {
    ctx.fillStyle = color;
    roundRect(ctx, e.x, e.y, w, titleH, 8);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `700 12px ${theme.font}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, e.x + 8, e.y + titleH / 2);
  }

  // header row
  const hy = e.y + titleH;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.fillRect(e.x, hy, w, headerH);
  columns.forEach((col, i) => {
    ctx.fillStyle = theme.textColor;
    ctx.font = `700 11px ${theme.font}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(col, e.x + i * cw + 7, hy + headerH / 2);
  });

  // body rows
  rows.forEach((row, r) => {
    const ry = hy + headerH + r * rowH;
    if (highlightRow === r) {
      ctx.fillStyle = 'rgba(37,99,235,0.22)';
      ctx.fillRect(e.x, ry, w, rowH);
    }
    row.forEach((cellVal, c) => {
      ctx.fillStyle = theme.mutedTextColor;
      ctx.font = `12px ${theme.font}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cellVal), e.x + c * cw + 7, ry + rowH / 2);
    });
  });

  // outer border + grid lines
  const totalH = titleH + headerH + rows.length * rowH;
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(e.x, e.y, w, totalH);
  for (let i = 1; i < columns.length; i++) {
    ctx.beginPath();
    ctx.moveTo(e.x + i * cw, hy);
    ctx.lineTo(e.x + i * cw, e.y + totalH);
    ctx.stroke();
  }
}

/** Shapes that render their own internal text and should skip the center label. */
const SELF_LABELLED = new Set(['matrix', 'table']);

export function drawEntity(
  ctx: CanvasRenderingContext2D,
  e: EntityState,
  theme: ResolvedTheme,
) {
  if (e.visible === false) return;
  const color = entityColor(e, theme);
  const opacity = e.opacity ?? 1;
  const scale = e.scale ?? 1;
  const { cx, cy } = entityCenter(e);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  if (e.rotation) ctx.rotate((e.rotation * Math.PI) / 180);
  if (scale !== 1) ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  const shape = e.shape ?? 'circle';

  if (shape === 'circle') {
    const r = e.radius ?? 22;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // progress ring
    if (e.progress !== undefined) {
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * e.progress);
      ctx.stroke();
    }
  } else if (shape === 'rect' || shape === 'pill') {
    const w = e.width ?? 80;
    const h = e.height ?? 48;
    const radius = shape === 'pill' ? h / 2 : 10;
    ctx.fillStyle = color;
    roundRect(ctx, e.x, e.y, w, h, radius);
    ctx.fill();
    // progress fill bar (left→right)
    if (e.progress !== undefined) {
      ctx.save();
      roundRect(ctx, e.x, e.y, w, h, radius);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.fillRect(e.x, e.y, w * e.progress, h);
      ctx.restore();
    }
  } else if (shape === 'diamond') {
    const r = e.radius ?? 26;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx + r, cy);
    ctx.lineTo(cx, cy + r);
    ctx.lineTo(cx - r, cy);
    ctx.closePath();
    ctx.fill();
  } else if (shape === 'node') {
    // graph vertex: filled circle with a crisp outline
    const r = e.radius ?? 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.stroke();
  } else if (shape === 'packet' || shape === 'arrayCell') {
    // small square (packet) / indexed cell (array) with a border
    const w = e.width ?? (shape === 'packet' ? 26 : 48);
    const h = e.height ?? (shape === 'packet' ? 26 : 48);
    ctx.fillStyle = color;
    roundRect(ctx, e.x, e.y, w, h, 6);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.stroke();
  } else if (shape === 'cylinder') {
    // database / datastore cylinder
    const w = e.width ?? 90;
    const h = e.height ?? 70;
    const ell = Math.min(14, h * 0.22);
    ctx.fillStyle = color;
    // body
    ctx.beginPath();
    ctx.moveTo(e.x, e.y + ell);
    ctx.lineTo(e.x, e.y + h - ell);
    ctx.bezierCurveTo(e.x, e.y + h + ell, e.x + w, e.y + h + ell, e.x + w, e.y + h - ell);
    ctx.lineTo(e.x + w, e.y + ell);
    ctx.closePath();
    ctx.fill();
    // top ellipse
    ctx.beginPath();
    ctx.ellipse(cx, e.y + ell, w / 2, ell, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (shape === 'matrix') {
    drawMatrix(ctx, e, theme, color);
  } else if (shape === 'table') {
    drawTable(ctx, e, theme, color);
  }

  // ── labels ──────────────────────────────────────────────────────────────
  // matrix/table render their own internal text.
  if (SELF_LABELLED.has(shape)) {
    ctx.restore();
    return;
  }
  ctx.globalAlpha = opacity;
  // cylinder captions sit below the shape; others centre inside.
  const labelY = shape === 'cylinder' ? cy + (e.height ?? 70) / 2 + 2 : cy;
  if (e.label) {
    ctx.fillStyle = shape === 'text' ? color : '#FFFFFF';
    ctx.font = `600 13px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.label, cx, e.sublabel ? labelY - 7 : labelY);
  }
  if (e.sublabel) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = `11px ${theme.font}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(e.sublabel, cx, labelY + 9);
  }
  ctx.restore();
}

/** Draws the caption ribbon at the bottom of the canvas. */
export function drawCaption(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  theme: ResolvedTheme,
  caption?: string,
) {
  if (!caption) return;
  ctx.save();
  ctx.fillStyle = 'rgba(15,23,42,0.72)';
  const h = 34;
  ctx.fillRect(0, height - h, width, h);
  ctx.fillStyle = theme.textColor;
  ctx.font = `500 13px ${theme.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(caption, width / 2, height - h / 2, width - 24);
  ctx.restore();
}

/** Full-scene render: background → connections → entities → caption. */
export function renderFrame(
  ctx: CanvasRenderingContext2D,
  frame: ResolvedFrame,
  width: number,
  height: number,
  theme: ResolvedTheme,
  opts: { grid?: boolean; caption?: boolean } = {},
) {
  paintBackground(ctx, width, height, theme, opts.grid ?? true);

  const byId = new Map(frame.entities.map((e) => [e.id, e]));
  frame.connections.forEach((c) => drawConnection(ctx, c, byId, theme));
  frame.entities.forEach((e) => drawEntity(ctx, e, theme));

  if (opts.caption ?? true) {
    drawCaption(ctx, width, height, theme, frame.caption);
  }
}
