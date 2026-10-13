import type { Renderer } from "./index";

/** Renders state.matrix (number[][]) as a grid, highlighting state.cursor [r,c]. */
export const renderMatrix: Renderer = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const matrix = (step.state["matrix"] ?? []) as unknown[][];
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

  const cursor = step.state["cursor"] as [number, number] | undefined;
  const visited = new Set(
    ((step.state["visited"] as Array<[number, number]>) ?? []).map(
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
