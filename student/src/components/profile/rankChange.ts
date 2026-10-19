export interface RankChange { previousRank: number | null; currentRank: number; changed: boolean }

export function rankChangeKind(change: RankChange): 'entered' | 'up' | 'down' | 'unranked' | null {
  if (!change.changed || change.previousRank == null || change.previousRank === change.currentRank) return null;
  if (change.currentRank === 0) return 'unranked';
  if (change.previousRank === 0) return 'entered';
  return change.currentRank < change.previousRank ? 'up' : 'down';
}
