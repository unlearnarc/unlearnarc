import type { Renderer } from "./shared";
import { highlightMap } from "./shared";

interface GraphNode {
  id: string | number;
  label?: string;
  x?: number;
  y?: number;
}
interface GraphEdge {
  from: string | number;
  to: string | number;
  weight?: number | string;
}

/**
 * Renders state.nodes / state.edges. If nodes lack x/y, lays them out on a
 * circle so authors can supply a pure adjacency description.
 */
export const renderGraph: Renderer = (rc, step) => {
  const { ctx, width, height, theme } = rc;
  const nodes = (step.state["nodes"] ?? []) as GraphNode[];
  const edges = (step.state["edges"] ?? []) as GraphEdge[];
  if (!nodes.length) return;

  const nodeColors = highlightMap(step, "nodes", theme.styleColors);
  const edgeColors = highlightMap(step, "edges", theme.styleColors);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) / 2 - 60;
  const pos = new Map<string, { x: number; y: number }>();

  nodes.forEach((n, i) => {
    const x = n.x ?? cx + radius * Math.cos((2 * Math.PI * i) / nodes.length - Math.PI / 2);
    const y = n.y ?? cy + radius * Math.sin((2 * Math.PI * i) / nodes.length - Math.PI / 2);
    pos.set(String(n.id), { x, y });
  });

  ctx.font = theme.font;
  ctx.textAlign = "center";

  // edges
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
    if (e.weight !== undefined) {
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(String(e.weight), (a.x + b.x) / 2, (a.y + b.y) / 2 - 4);
    }
  });

  // nodes
  const rNode = 20;
  nodes.forEach((n) => {
    const p = pos.get(String(n.id))!;
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
