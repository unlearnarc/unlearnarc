import type { VisualizerType } from '../core/types';
import type { Renderer } from './shared';
export type { RenderContext, Renderer } from './shared';
export { resolveTheme, highlightMap } from './shared';

import { renderArray } from './arrayRenderer';
import { renderGraph } from './graphRenderer';
import { renderStack } from './stackRenderer';
import { renderMatrix } from './matrixRenderer';

export const RENDERERS: Partial<Record<VisualizerType, Renderer>> = {
  ARRAY: renderArray,
  STACK: renderStack,
  QUEUE: renderStack,
  GRAPH: renderGraph,
  TREE: renderGraph,
  MATRIX: renderMatrix,
};

export function getRenderer(type: VisualizerType): Renderer {
  return RENDERERS[type] ?? renderArray;
}
