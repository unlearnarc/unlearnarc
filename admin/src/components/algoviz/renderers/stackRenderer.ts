import type { Renderer } from "./index";
import { highlightMap } from "./index";

/** Renders state.stack / state.queue as a vertical pile of cells. */
export const renderStack: Renderer = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const values = (step.state["stack"] ??
    step.state["queue"] ??
    step.state["items"] ??
    []) as unknown[];
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
