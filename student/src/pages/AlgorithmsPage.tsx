import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { algorithmAPI } from '../api/endpoints';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import type { Algorithm } from '../components/algoviz';
import { Workflow, Search, Boxes, ArrowRight } from 'lucide-react';

export const AlgorithmsPage: React.FC = () => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['algorithms', 'published'],
    queryFn: algorithmAPI.getAll,
  });

  const algorithms: Algorithm[] = data?.data?.data ?? [];

  const categories = useMemo(
    () => [...new Set(algorithms.map((a) => a.category).filter(Boolean))] as string[],
    [algorithms]
  );

  const filtered = useMemo(
    () =>
      algorithms.filter((a) => {
        const matchSearch =
          !search ||
          a.title.toLowerCase().includes(search.toLowerCase()) ||
          (a.summary ?? '').toLowerCase().includes(search.toLowerCase());
        const matchCat = !category || a.category === category;
        return matchSearch && matchCat;
      }),
    [algorithms, search, category]
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary mb-1 flex items-center gap-2">
          <Workflow size={22} className="text-primary-500" />
          {t('algorithms.title')}
        </h1>
        <p className="text-sm text-text-secondary">{t('algorithms.subtitle')}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('algorithms.searchPlaceholder')}
            className="input pl-9"
          />
        </div>
        {categories.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory((v) => (v === c ? '' : c))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  category === c
                    ? 'bg-primary-500 text-white border-primary-500'
                    : 'bg-surface text-text-secondary border-border hover:border-primary-500 hover:text-primary-500'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={t('algorithms.empty')}
          description={t('algorithms.emptyDesc')}
        />
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((algo) => (
            <Link
              key={algo.id}
              to={`/algorithms/${algo.slug}`}
              className="card p-5 hover:-translate-y-1 transition-all duration-200 block group"
            >
              <div className="w-full h-28 rounded-[10px] bg-gradient-primary flex items-center justify-center mb-4 group-hover:shadow-hover transition">
                <Workflow size={30} className="text-white/80" />
              </div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">
                  {algo.title}
                </h3>
                {algo.difficulty && <Badge label={algo.difficulty} className="shrink-0" />}
              </div>
              {algo.summary && (
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{algo.summary}</p>
              )}
              <div className="flex items-center justify-between">
                <Badge label={algo.visualizer} />
                <span className="flex items-center gap-1 text-xs text-primary-500 font-medium opacity-0 group-hover:opacity-100 transition">
                  {t('algorithms.visualize')} <ArrowRight size={12} className="ua-flip-rtl" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
