import type { Theme } from '../context/ThemeContext';

/** Canvas needs concrete colors; DOM panels use the matching semantic CSS tokens. */
export function visualizationPalette(mode: Theme) {
  return mode === 'light' ? {
    background: '#FFFFFF', elementFill: '#EEF2F7', elementStroke: '#CBD5E1',
    textColor: '#17212B', mutedTextColor: '#526277',
    gridColor: 'rgba(15,23,42,0.08)', surface: '#F1F5F9',
    border: '#CBD5E1', caption: 'rgba(241,245,249,0.96)',
  } : {
    background: '#0F172A', elementFill: '#16232E', elementStroke: '#2B3A49',
    textColor: '#F1F5F9', mutedTextColor: '#94A3B8',
    gridColor: 'rgba(148,163,184,0.08)', surface: '#1E293B',
    border: '#475569', caption: 'rgba(15,23,42,0.92)',
  };
}
