import type { Renderer } from "./index";
import { highlightMap } from "./index";

/**
 * Renders state.array (number[] | {value}[] ) as labelled bars/cells.
 * Draws pointer labels from step.pointers above the matching indices.
 */
export const renderArray: Renderer = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const raw = (step.state["array"] ?? step.state["values"] ?? []) as unknown[];
  const values = raw.map((v) =>
    typeof v === "object" && v !== null ? (v as any).value ?? 0 : v
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
  const maxVal = numeric ? Math.max(...(values as number[]), 1) : 1;
  const baseY = height - 48;
  const maxBarH = height - 120;

  ctx.font = theme.font;
  ctx.textAlign = "center";

  values.forEach((val, i) => {
    const x = pad + i * (cellW + gap);
    const barH = numeric
      ? Math.max(6, ((val as number) / maxVal) * maxBarH)
      : 40;
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

    // pointers (i/j/pivot) above the cell
    const labels = pointerLabelsFor(step.pointers, i);
    if (labels.length) {
      ctx.fillStyle = theme.styleColors.ACTIVE ?? "#22c55e";
      ctx.fillText(labels.join(" "), x + cellW / 2, y - 10);
    }
  });
};

function pointerLabelsFor(
  pointers: Record<string, unknown> | undefined,
  index: number
): string[] {
  if (!pointers) return [];
  return Object.entries(pointers)
    .filter(([, v]) => Number(v) === index)
    .map(([k]) => k);
}

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
