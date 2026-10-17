import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Globe, MapPin, Crown, Medal, TrendingUp, Award } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { leaderboardAPI } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Spinner, EmptyState, InitialsBadge } from '../components/ui';
import './leaderboard.css';

/* =============================================================================
   LeaderboardPage — points-based ranking across the whole platform.
   - Global board (everyone) and Region board (filtered by user.region).
   - Highlights the current user's row and shows their own standing on top.
   Points are earned from graded quizzes/tests and contest submissions; the
   backend keeps user.points as a fast-read cache (hybrid model).

   Identity is shown with circular INITIALS badges (first letter of the name) —
   never avatar images / external services (see <InitialsBadge/>).
   ============================================================================= */

interface Row {
  rank: number;
  userId: string;
  name: string;
  region?: string;
  points: number;
  isCurrentUser: boolean;
}

/** Unwraps ApiResponse<{ data }> regardless of axios/ApiResponse nesting. */
const unwrap = <T,>(res: any): T => res?.data?.data ?? res?.data;

/* -----------------------------------------------------------------------------
   PodiumCard — one of the top-3 pedestals. Visual order is 2 · 1 · 3 with the
   first-place column elevated. Gold / silver / bronze accents per place.
   --------------------------------------------------------------------------- */
const PodiumCard: React.FC<{ row: Row; place: 1 | 2 | 3 }> = ({ row, place }) => {
  const { t } = useTranslation();
  const styles = {
    1: {
      order: 'order-2',
      badge: 'lg' as const,
      ring: 'ring-4 ring-[var(--ua-tier-gold)]',
      step: 'h-20 sm:h-24',
      stepBg: 'from-[var(--ua-tier-gold)] to-[var(--ua-tier-gold)]/60',
      stepText: 'text-[#1A1206]',
      chip: 'bg-[var(--ua-tier-gold)] text-[#1A1206]',
      icon: <Crown className="text-[var(--ua-tier-gold)]" size={24} fill="currentColor" />,
    },
    2: {
      order: 'order-1',
      badge: 'md' as const,
      ring: 'ring-4 ring-[var(--ua-tier-silver)]',
      step: 'h-14 sm:h-16',
      stepBg: 'from-[var(--ua-tier-silver)] to-[var(--ua-tier-silver)]/60',
      stepText: 'text-[#1A2230]',
      chip: 'bg-[var(--ua-tier-silver)] text-[#1A2230]',
      icon: <Medal className="text-[var(--ua-tier-silver)]" size={20} />,
    },
    3: {
      order: 'order-3',
      badge: 'md' as const,
      ring: 'ring-4 ring-[var(--ua-tier-bronze)]',
      step: 'h-10 sm:h-12',
      stepBg: 'from-[var(--ua-tier-bronze)] to-[var(--ua-tier-bronze)]/60',
      stepText: 'text-white',
      chip: 'bg-[var(--ua-tier-bronze)] text-white',
      icon: <Medal className="text-[var(--ua-tier-bronze)]" size={20} />,
    },
  }[place];

  return (
    <div className={`leaderboard-podium leaderboard-place-${place} flex flex-col items-center ${styles.order} flex-1 min-w-0 self-end`}>
      <div className="mb-1">{styles.icon}</div>

      {/* Identity: initials badge, rank chip, name, region, points */}
      <div className={`relative ${row.isCurrentUser ? 'scale-105' : ''} transition-transform`}>
        <InitialsBadge
          name={row.name}
          size={styles.badge}
          tone={place === 1 ? 'cyan' : 'blue'}
          ringClassName={`${styles.ring} shadow-lg`}
        />
        <span
          className={`absolute -bottom-1 left-1/2 -translate-x-1/2 ${styles.chip} text-[10px] font-extrabold w-5 h-5 grid place-items-center rounded-full shadow`}
        >
          {place}
        </span>
      </div>

      <p className="mt-2 w-full text-[11px] sm:text-sm font-semibold text-text-primary text-center truncate px-0.5">
        {row.name}
        {row.isCurrentUser && <span className="text-primary-500"> {t('leaderboard.you')}</span>}
      </p>
      {row.region && (
        <p className="w-full text-[10px] sm:text-[11px] text-text-muted text-center truncate px-0.5">
          {row.region}
        </p>
      )}
      <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-primary-500 tabular-nums truncate max-w-full">
        {row.points} {t('leaderboard.ptsLabel')}
      </p>

      {/* Stepped pedestal — gold tallest, then silver, then bronze */}
      <div
        className={`mt-2 w-full ${styles.step} rounded-t-lg bg-gradient-to-b ${styles.stepBg} grid place-items-center shadow-inner`}
      >
        <span className={`text-lg sm:text-2xl font-extrabold ${styles.stepText} drop-shadow-sm`}>
          {place}
        </span>
      </div>
    </div>
  );
};

/* -----------------------------------------------------------------------------
   RankRow — a single learner below the podium. Responsive: name left, points
   right-aligned; the current user's row gets a tinted / ringed highlight.
   --------------------------------------------------------------------------- */
const RankRow: React.FC<{ row: Row }> = ({ row }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`leaderboard-row ${row.isCurrentUser ? 'leaderboard-row-self' : ''} group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-colors ${
        row.isCurrentUser
          ? 'bg-primary-500/10 ring-1 ring-inset ring-primary-500/40'
          : 'hover:bg-surface-soft'
      }`}
    >
      <div className="w-6 sm:w-8 text-center font-bold text-text-secondary shrink-0 tabular-nums">
        {row.rank}
      </div>
      <InitialsBadge name={row.name} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary truncate">
          {row.name}
          {row.isCurrentUser && <span className="text-primary-500"> {t('leaderboard.you')}</span>}
        </p>
        {row.region && (
          <p className="text-xs text-text-muted flex items-center gap-1 truncate">
            <MapPin size={10} className="shrink-0" /> <span className="truncate">{row.region}</span>
          </p>
        )}
      </div>
      <p className="shrink-0 text-right tabular-nums whitespace-nowrap">
        <span className="text-sm font-bold text-text-primary">{row.points}</span>
        <span className="text-xs font-normal text-text-muted ml-1">{t('leaderboard.ptsLabel')}</span>
      </p>
    </div>
  );
};

export const LeaderboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [scope, setScope]   = useState<'GLOBAL' | 'REGION'>('GLOBAL');
  const [region, setRegion] = useState<string>(user?.region ?? '');

  const regionsQ = useQuery({
    queryKey: ['lb-regions'],
    queryFn: () => leaderboardAPI.regions().then(unwrap<string[]>),
  });
  const regions = regionsQ.data ?? [];

  const boardQ = useQuery({
    queryKey: ['leaderboard', scope, region],
    queryFn: () =>
      (scope === 'REGION' && region
        ? leaderboardAPI.region(region, 50)
        : leaderboardAPI.global(50)
      ).then(unwrap<Row[]>),
  });
  const rows = boardQ.data ?? [];

  const meQ = useQuery({
    queryKey: ['lb-me'],
    queryFn: () => leaderboardAPI.me().then(unwrap<Row>),
    enabled: !!user,
  });
  const me = meQ.data;

  const top3 = useMemo(() => rows.slice(0, 3), [rows]);
  const rest = useMemo(() => rows.slice(3), [rows]);
  const totalPlayers = rows.length;

  const showEmpty = scope === 'REGION' && !region;

  /* Filter toggle button — shared styling for Global / Region. */
  const ScopeButton: React.FC<{
    value: 'GLOBAL' | 'REGION';
    icon: React.ReactNode;
    label: string;
  }> = ({ value, icon, label }) => (
    <button
      type="button"
      onClick={() => setScope(value)}
      aria-pressed={scope === value}
      className={`px-4 py-1.5 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
        scope === value
          ? 'bg-primary-500 text-white shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="leaderboard-page space-y-5 sm:space-y-6 animate-fade-in">
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="leaderboard-header relative overflow-hidden rounded-2xl px-5 py-6 sm:px-7 sm:py-7">
        {/* decorative CSS trophy glyph */}
        <div className="pointer-events-none absolute -right-6 -top-8 opacity-15">
          <Trophy size={150} />
        </div>
        <div className="pointer-events-none absolute inset-0 ua-hero-grid opacity-40" />

        <div className="relative flex items-start gap-3">
          <div className="grid place-items-center w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 backdrop-blur shrink-0">
            <Trophy size={24} />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold leading-tight">{t('leaderboard.title')}</h1>
            <p className="text-xs sm:text-sm text-white/85 mt-0.5">{t('leaderboard.subtitle')}</p>
          </div>
        </div>

        {/* Filters + count live inside the hero for a compact, quick-scan top. */}
        <div className="relative mt-4 flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex p-1 rounded-full bg-white/10 backdrop-blur border border-white/15">
            <ScopeButton value="GLOBAL" icon={<Globe size={13} />} label={t('leaderboard.global')} />
            <ScopeButton value="REGION" icon={<MapPin size={13} />} label={t('leaderboard.region')} />
          </div>

          {scope === 'REGION' && (
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              aria-label={t('leaderboard.selectRegion')}
              className="h-9 py-0 px-3 text-xs rounded-full bg-white/10 backdrop-blur border border-white/20 text-white max-w-[200px] focus:outline-none focus:ring-2 focus:ring-white/40 [&>option]:text-text-primary"
            >
              <option value="">{t('leaderboard.selectRegion')}</option>
              {regions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          )}

          {!showEmpty && !boardQ.isLoading && totalPlayers > 0 && (
            <span className="ml-auto text-xs text-white/90 inline-flex items-center gap-1 font-medium">
              <Award size={13} /> {t('leaderboard.rankedLearners', { count: totalPlayers })}
            </span>
          )}
        </div>
      </section>

      {/* ── Your standing ─────────────────────────────────────────────── */}
      {me && (
        <div className="leaderboard-standing rounded-2xl p-[1.5px] shadow-card">
          <div className="flex items-center gap-3 sm:gap-4 p-4 rounded-2xl bg-surface">
            <InitialsBadge name={me.name} size="md" tone="cyan" ringClassName="shadow" />
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-500">
                {t('leaderboard.yourStanding')}
              </span>
              <p className="text-sm font-semibold text-text-primary truncate">{me.name}</p>
              <p className="text-xs text-text-muted flex items-center gap-1 truncate">
                <MapPin size={11} className="shrink-0" /> {me.region || t('leaderboard.noRegionSet')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-extrabold text-text-primary tabular-nums">
                {me.rank > 0 ? `#${me.rank}` : '—'}
              </div>
              <p className="text-xs font-semibold text-primary-500 flex items-center gap-1 justify-end tabular-nums">
                <TrendingUp size={12} /> {me.points} {t('leaderboard.ptsLabel')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Board ─────────────────────────────────────────────────────── */}
      {boardQ.isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : showEmpty ? (
        <EmptyState icon={MapPin} title={t('leaderboard.pickRegion')} description={t('leaderboard.pickRegionDesc')} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={t('leaderboard.noRanked')}
          description={t('leaderboard.noRankedDesc')}
        />
      ) : (
        <>
          {/* Podium for top 3 */}
          {top3.length > 0 && (
            <div className="card px-2 pt-6 pb-0 sm:px-8">
              <div className="flex items-end justify-center gap-2 sm:gap-4">
                {top3[1] && <PodiumCard row={top3[1]} place={2} />}
                {top3[0] && <PodiumCard row={top3[0]} place={1} />}
                {top3[2] && <PodiumCard row={top3[2]} place={3} />}
              </div>
            </div>
          )}

          {/* Remaining ranks */}
          {rest.length > 0 && (
            <div className="card divide-y divide-border overflow-hidden p-0">
              {rest.map((r) => (
                <RankRow key={r.userId} row={r} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
