import { describe, expect, it } from 'vitest';
import { highlightMap, resolveTheme } from './shared';
import { getRenderer } from './index';
import type { Step, VisualizerType } from '../core/types';

describe('renderer contracts', () => {
  it('merges theme overrides without losing defaults', () => {
    const theme = resolveTheme({ background: '#fff', styleColors: { ACTIVE: '#123' } });
    expect(theme.background).toBe('#fff');
    expect(theme.styleColors.ACTIVE).toBe('#123');
    expect(theme.textColor).toBe('#e2e8f0');
    expect(resolveTheme().font).toContain('14px');
  });
  it('scopes highlights by target and handles missing colors and indices', () => {
    const step = { highlights: [
      { target: 'array', style: 'custom', indices: [0, 2] },
      { target: 'graph', style: 'custom', indices: [1] },
      { target: 'array', style: 'missing', indices: [3] },
    ] } as unknown as Step;
    expect([...highlightMap(step, 'array', { custom: '#123' })]).toEqual([
      ['0', '#123'], ['2', '#123'], ['3', '#888'],
    ]);
    expect(highlightMap({} as Step, 'array', {})).toEqual(new Map());
  });
  it('loads every renderer and preserves aliases and fallback', () => {
    for (const type of ['ARRAY', 'STACK', 'QUEUE', 'GRAPH', 'TREE', 'MATRIX']) {
      expect(getRenderer(type as VisualizerType)).toBeTypeOf('function');
    }
    expect(getRenderer('QUEUE')).toBe(getRenderer('STACK'));
    expect(getRenderer('TREE')).toBe(getRenderer('GRAPH'));
    expect(getRenderer('unknown' as VisualizerType)).toBe(getRenderer('ARRAY'));
  });
});
