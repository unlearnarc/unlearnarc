import { describe, expect, it } from 'vitest';
import { rankChangeKind } from './rankChange';

describe('rank changes', () => {
  it('silences the first visit and unchanged standings', () => {
    expect(rankChangeKind({ previousRank: null, currentRank: 8, changed: false })).toBeNull();
    expect(rankChangeKind({ previousRank: 8, currentRank: 8, changed: true })).toBeNull();
  });
  it('celebrates entering and improving but not declines', () => {
    expect(rankChangeKind({ previousRank: 0, currentRank: 8, changed: true })).toBe('entered');
    expect(rankChangeKind({ previousRank: 8, currentRank: 3, changed: true })).toBe('up');
    expect(rankChangeKind({ previousRank: 3, currentRank: 8, changed: true })).toBe('down');
    expect(rankChangeKind({ previousRank: 3, currentRank: 0, changed: true })).toBe('unranked');
  });
});
