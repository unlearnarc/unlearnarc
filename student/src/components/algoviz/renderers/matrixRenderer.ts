import type { Renderer } from "./index";

/**
 * Renders state.matrix (number[][]) as a square-celled grid.
 *
 * Cell semantics (restrained palette, synced with the step inspector legend):
 *   • unvisited fillable cell  → theme.elementFill
 *   • blocked cell (value 0)   → a darker, muted surface
 *   • visited cell             → VISIT colour (blue)
 *   • active / cursor cell     → ACTIVE colour (green) + ring
 *
 * The grid is centered and scales to fit the available canvas while keeping
 * cells perfectly square and never overflowing the container.
 */
export const renderMatrix: Renderer = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const matrix = (step.state["matrix"] ?? []) as unknown[][];
  if (!matrix.length) return;

  const rows = matrix.length;
  const cols = matrix[0].length;
  const pad = 20;
  const cell = Math.min(
    (width - pad * 2) / cols,
    (height - pad * 2) / rows,
    72
  );
  const gridW = cell * cols;
  const gridH = cell * rows;
  const ox = (width - gridW) / 2;
  const oy = (height - gridH) / 2;
  const gap = Math.max(2, Math.round(cell * 0.06));
  const radius = Math.max(4, Math.round(cell * 0.14));

  const cursor = step.state["cursor"] as [number, number] | undefined;
  const visited = new Set(
    ((step.state["visited"] as Array<[number, number]>) ?? []).map(
      ([r, c]) => `${r},${c}`
    )
  );

  const blockedFill = "#0C1522";
  const unvisitedFill = theme.elementFill;
  const visitedFill = theme.styleColors.VISIT ?? "#3288F5";
  const activeFill = theme.styleColors.ACTIVE ?? "#22C55E";

  ctx.font = theme.font;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = ox + c * cell + gap / 2;
      const y = oy + r * cell + gap / 2;
      const w = cell - gap;
      const h = cell - gap;

      const key = `${r},${c}`;
      const value = matrix[r][c];
      const isBlocked = value === 0 || value === "0";
      const isVisited = visited.has(key);
      const isActive = !!cursor && cursor[0] === r && cursor[1] === c;

      let fill = unvisitedFill;
      if (isBlocked) fill = blockedFill;
      if (isVisited) fill = visitedFill;
      if (isActive) fill = activeFill;

      ctx.fillStyle = fill;
      ctx.strokeStyle = theme.elementStroke;
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, w, h, radius);
      ctx.fill();
      ctx.stroke();

      // Active-cell focus ring for clear emphasis.
      if (isActive) {
        ctx.save();
        ctx.strokeStyle = "#86EFAC";
        ctx.lineWidth = 2.5;
        roundRect(ctx, x - 2, y - 2, w + 4, h + 4, radius + 2);
        ctx.stroke();
        ctx.restore();
      }

      // Cell value — readable contrast on each background.
      ctx.fillStyle = isBlocked
        ? "#51657C"
        : isVisited || isActive
        ? "#FFFFFF"
        : theme.textColor;
      ctx.font = `600 ${Math.max(11, Math.round(cell * 0.28))}px ui-sans-serif, system-ui, sans-serif`;
      ctx.fillText(String(value), x + w / 2, y + h / 2 + 0.5);
    }
  }

  ctx.textBaseline = "alphabetic";
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
