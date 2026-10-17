import type { PlayerTheme, Step, VisualizationSpec } from '../core/types';
import { DEFAULT_STYLE_COLORS } from '../core/types';

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  theme: Required<Pick<PlayerTheme, 'background' | 'elementFill' | 'elementStroke' | 'textColor' | 'font'>> & {
    styleColors: Record<string, string>;
  };
}

export type Renderer = (rc: RenderContext, step: Step, spec: VisualizationSpec) => void;

export function resolveTheme(theme?: PlayerTheme): RenderContext['theme'] {
  return {
    background: theme?.background ?? '#0f172a',
    elementFill: theme?.elementFill ?? '#1e293b',
    elementStroke: theme?.elementStroke ?? '#475569',
    textColor: theme?.textColor ?? '#e2e8f0',
    font: theme?.font ?? '600 14px ui-sans-serif, system-ui, sans-serif',
    styleColors: { ...DEFAULT_STYLE_COLORS, ...(theme?.styleColors ?? {}) },
  };
}

/** Collect index -> colour from the step's highlights for a given target. */
export function highlightMap(step: Step, target: string, styleColors: Record<string, string>): Map<string, string> {
  const map = new Map<string, string>();
  for (const h of step.highlights ?? []) {
    if (h.target !== target) continue;
    const color = styleColors[h.style] ?? '#888';
    for (const idx of h.indices ?? []) map.set(String(idx), color);
  }
  return map;
}
