import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { leaderboardAPI } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { isDnd } from '../../pwa/notifications';
import { rankChangeKind, type RankChange } from './rankChange';
import './rank-change.css';

// Shared guard prevents duplicate checks during Strict Mode's effect replay.
const checking = new Set<string>();
const CHECK_INTERVAL = 5 * 60 * 1000;
const lastChecks = new Map<string, number>();

// Survive navigation, full-screen remounts and reloads in this tab. Failed
// requests also consume the cooldown so outages do not cause request storms.
function claimCheck(id: string): boolean {
  const key = `ua_rank_check:${id}`;
  let last = lastChecks.get(id);
  try {
    const stored = sessionStorage.getItem(key);
    if (stored !== null) last = Math.max(last ?? 0, Number(stored) || 0);
  } catch { /* Storage may be disabled; the in-memory guard still applies. */ }
  const now = Date.now();
  if (last !== undefined && now - last < CHECK_INTERVAL) return false;
  lastChecks.set(id, now);
  try { sessionStorage.setItem(key, String(now)); } catch { /* Best-effort. */ }
  return true;
}

export function RankChangeNotifier() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const client = useQueryClient();
  const navigate = useNavigate();
  useEffect(() => {
    const id = user?.id;
    if (!id) return;
    let disposed = false;
    async function check() {
      if (!id || disposed || document.visibilityState === 'hidden' || isDnd() || checking.has(id) || !claimCheck(id)) return;
      checking.add(id);
      try {
        const response = await leaderboardAPI.rankChange();
        if (disposed || isDnd()) return;
        const change = response.data.data as RankChange;
        const kind = rankChangeKind(change);
        if (!kind) return;
        void client.invalidateQueries({ queryKey: ['lb-me'] });
        void client.invalidateQueries({ queryKey: ['leaderboard'] });
        const improved = kind === 'up' || kind === 'entered';
        const title = kind === 'entered' ? t('rankChange.entered', 'You joined the leaderboard!')
          : kind === 'up' ? t('rankChange.up', 'Your rank improved!')
          : t('rankChange.updated', 'Your ranking has changed');
        toast.custom(item => <div className={`rank-change card ${item.visible ? '' : 'rank-change-hidden'}`} role="status">
          {improved && <div className="rank-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ left: `${index * 8}%`, animationDelay: `${index % 4 * 0.1}s` }} />)}</div>}
          <div className="relative space-y-2"><strong>{improved ? '🎉 ' : ''}{title}</strong>
            <p className="text-sm text-text-secondary">{kind === 'unranked' ? t('rankChange.unranked', 'Keep learning to earn your next leaderboard position.') : t('rankChange.position', { defaultValue: 'Global rank: #{{rank}}', rank: change.currentRank })}</p>
            {change.previousRank! > 0 && change.currentRank > 0 && <p className="text-xs text-text-secondary">#{change.previousRank} → #{change.currentRank}</p>}
            <div className="flex items-center justify-between gap-4"><button className="text-primary-500 text-sm" onClick={() => { toast.dismiss(item.id); navigate('/leaderboard'); }}>{t('rankChange.view', 'View leaderboard')}</button><button className="text-xs text-text-secondary" onClick={() => toast.dismiss(item.id)}>{t('rankChange.dismiss', 'Dismiss')}</button></div>
          </div>
        </div>, { id: `rank-change-${id}`, duration: 6500 });
      } catch { /* Best-effort: rank checks must never interrupt learning. */ }
      finally { if (id) checking.delete(id); }
    }
    // Defer startup until effects settle, avoiding Strict Mode's discarded mount.
    let timer: number | undefined;
    const startup = window.setTimeout(() => {
      void check();
      timer = window.setInterval(() => void check(), CHECK_INTERVAL);
    }, 300);
    const onVisible = () => void check();
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => { disposed = true; window.clearTimeout(startup); window.clearInterval(timer); window.removeEventListener('focus', onVisible); document.removeEventListener('visibilitychange', onVisible); };
  }, [user?.id, t, client, navigate]);
  return null;
}
