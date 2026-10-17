import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Clapperboard, Info, Boxes } from 'lucide-react';
import { animationSceneAPI } from '../api/endpoints';
import { CanvasAnimator } from '../components/animations';
import type { AnimationTrace } from '../components/animations';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

/* =============================================================================
   AnimationsPage — a gallery for the Canvas Animation Engine.

   Scenes are now populated from the backend:
     GET /api/v1/animation-scenes/published   (summaries, no trace)
     GET /api/v1/animation-scenes/{id}        (full scene incl. trace)

   ONE engine renders every tutorial domain (concurrency, system design, DSA,
   SQL, AI/ML, …) from the same trace shape. Picking a scene lazily fetches its
   full trace and mounts it in the CanvasAnimator — step-by-step instructions,
   mid-animation checkpoint questions, attached code programs and "where to use"
   notes all travel inside the trace from the DB.
   ============================================================================= */

/** Lightweight catalog item returned by the published feed (no trace). */
interface SceneSummary {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: string;
  source?: string;
  kind?: string;
  keyframeCount?: number;
  duration?: number;
}

/** Full scene payload (summary + resolved trace). */
interface SceneDetail extends SceneSummary {
  trace: AnimationTrace;
}

export const AnimationsPage: React.FC = () => {
  const { t } = useTranslation();
  const categoryLabel = (c: string): string => t(`animations.categories.${c}`, { defaultValue: c });
  const [category, setCategory] = useState<string>('ALL');
  const [activeId, setActiveId] = useState<string | null>(null);

  // ── Published catalog (summaries) ─────────────────────────────────────────
  const { data: listRes, isLoading: listLoading } = useQuery({
    queryKey: ['animation-scenes', 'published'],
    queryFn: () => animationSceneAPI.getAll(),
  });

  const scenes: SceneSummary[] = listRes?.data?.data ?? [];

  // Derive the category filter chips from what the DB actually returned.
  const categories = useMemo(() => {
    const present = new Set(scenes.map((s) => s.category).filter(Boolean) as string[]);
    return ['ALL', ...Array.from(present)];
  }, [scenes]);

  const filtered = useMemo(
    () => (category === 'ALL' ? scenes : scenes.filter((s) => s.category === category)),
    [scenes, category],
  );

  // Default-select the first scene in the current filter.
  const selectedId =
    activeId && filtered.some((s) => s.id === activeId)
      ? activeId
      : filtered[0]?.id ?? null;

  // ── Full scene (trace) for the selected id ────────────────────────────────
  const { data: detailRes, isLoading: detailLoading } = useQuery({
    queryKey: ['animation-scene', selectedId],
    queryFn: () => animationSceneAPI.getById(selectedId!),
    enabled: !!selectedId,
  });

  const detail: SceneDetail | undefined = detailRes?.data?.data;
  const trace = detail?.trace;

  return (
    <div className="space-y-5 animate-fade-in">
      <header className="flex items-start gap-3">
        <span className="mt-0.5 text-primary-500 shrink-0">
          <Clapperboard size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-text-primary">
            {t('animations.title')}
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-2xl leading-relaxed">
            {t('animations.subtitle')}
          </p>
        </div>
      </header>

      <div className="ua-card px-4 py-3 flex items-start gap-2.5" role="note">
        <Info size={15} className="text-primary-500 mt-0.5 shrink-0" />
        <p className="text-[13px] text-text-secondary leading-relaxed">
          {t('animations.noteBefore')}
          <code className="ua-force-ltr" dir="ltr">/api/v1/animation-scenes</code>
          {t('animations.noteAfter')}
        </p>
      </div>

      {listLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : scenes.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('animations.empty')}
          description={t('animations.emptyDesc')}
        />
      ) : (
        <>
          {/* category selector (derived from DB content) */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Animation domains">
              {categories.map((c) => (
                <button
                  key={c}
                  role="tab"
                  aria-selected={category === c}
                  onClick={() => {
                    setCategory(c);
                    setActiveId(null);
                  }}
                  className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-semibold transition ${
                    category === c
                      ? 'border-primary-500 bg-primary-500 text-white'
                      : 'border-border text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {categoryLabel(c)}
                </button>
              ))}
            </div>
          )}

          <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-4">
            {/* Compact scene picker keeps the player near the top on phones. */}
            <label className="lg:hidden flex flex-col gap-1.5 text-xs font-semibold text-text-secondary min-w-0">
              Choose an animation
              <select
                aria-label="Choose an animation"
                value={selectedId ?? ''}
                onChange={event => setActiveId(event.target.value)}
                className="w-full min-w-0 min-h-11 rounded-lg border border-border bg-surface text-text-primary px-3 text-sm"
              >
                {filtered.map(scene => <option key={scene.id} value={scene.id}>{scene.title}</option>)}
              </select>
            </label>
            {/* scene list */}
            <aside
              className="hidden lg:block rounded-xl border border-border divide-y divide-border overflow-hidden self-start"
              role="tablist"
              aria-label="Scenes"
            >
              {filtered.map((s) => (
                <button
                  key={s.id}
                  role="tab"
                  aria-selected={selectedId === s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`w-full text-left px-3.5 py-3 transition ${
                    selectedId === s.id
                      ? 'bg-primary-50'
                      : 'hover:bg-surface-soft'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-text-primary leading-snug line-clamp-2">
                      {s.title}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-text-muted">
                    {s.category && (
                      <span className="rounded bg-surface-soft px-1.5 py-0.5">
                        {categoryLabel(s.category)}
                      </span>
                    )}
                    {typeof s.duration === 'number' && (
                      <span>{(s.duration / 1000).toFixed(1)}s</span>
                    )}
                    {typeof s.keyframeCount === 'number' && (
                      <span>· {t('animations.frames', { count: s.keyframeCount })}</span>
                    )}
                  </div>
                </button>
              ))}
            </aside>

            {/* active scene */}
            <section
              className="rounded-2xl border border-border p-2.5 sm:p-4 md:p-5 space-y-3 min-w-0"
              style={{ background: 'var(--ua-surface)' }}
              aria-label={trace?.title ?? 'Animation'}
            >
              {detailLoading || !trace ? (
                <div className="flex justify-center py-24">
                  <Spinner size="lg" />
                </div>
              ) : (
                <>
                  <header className="min-w-0">
                    <h3 className="text-base font-bold text-text-primary leading-snug">
                      {trace.title}
                    </h3>
                    {trace.description && (
                      <p className="text-[13px] text-text-secondary leading-relaxed mt-0.5">
                        {trace.description}
                      </p>
                    )}
                  </header>

                  <CanvasAnimator
                    key={trace.id}
                    traceData={trace}
                    autoPlay={false}
                    initialSpeed={1}
                    showGrid
                    showCaption
                    showInstructions
                    showNotes
                    showCode
                    enableCheckpoints
                  />
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};
