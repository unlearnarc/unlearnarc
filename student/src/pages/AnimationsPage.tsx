import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PanelsTopLeft, Search, Boxes } from 'lucide-react';
import { animationSceneAPI } from '../api/endpoints';
import { AnimationDetail, type AnimationDetailRecord } from '../components/animations/AnimationDetail';
import { AnimationLibraryCard } from '../components/animations/AnimationLibraryCard';
import { AnimationCategoryHeader } from '../components/animations/AnimationCategoryHeader';
import { allCategory, animationCategories, categoryFor, selectScenes, type AnimationSort, type SceneSummary } from '../components/animations/catalog';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import './animations-library.css';

export const AnimationsPage = () => {
  const [params, setParams] = useSearchParams();
  const activeDomain = animationCategories.find(domain => domain.id === params.get('category'));
  const category = activeDomain?.id ?? 'ALL';
  const selectedId = params.get('scene');
  const [term, setTerm] = useState('');
  const [sort, setSort] = useState<AnimationSort>('name');
  const list = useQuery({ queryKey: ['animation-scenes', 'published'], queryFn: () => animationSceneAPI.getAll() });
  const scenes: SceneSummary[] = list.data?.data?.data ?? [];
  const detail = useQuery({
    queryKey: ['animation-scene', selectedId],
    queryFn: () => animationSceneAPI.getById(selectedId!),
    enabled: !!selectedId,
  });
  const selectedScene: AnimationDetailRecord | undefined = detail.data?.data?.data;
  const trace = selectedScene?.trace;
  const filtered = selectScenes(scenes, term, category, sort);
  const counts = new Map(animationCategories.map(domain => [domain.id, scenes.filter(scene => categoryFor(scene).id === domain.id).length]));
  const chooseCategory = (id: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    next.delete('scene');
    if (id === 'ALL') next.delete('category'); else next.set('category', id);
    return next;
  });
  const catalogParams = new URLSearchParams(params);
  catalogParams.delete('scene');
  const catalogHref = `/animations${catalogParams.size ? `?${catalogParams}` : ''}`;
  const sceneHref = (id: string) => {
    const next = new URLSearchParams(params);
    next.set('scene', id);
    return `/animations?${next}`;
  };
  const reset = () => { setTerm(''); setSort('name'); chooseCategory('ALL'); };

  if (selectedId) return (
    <div className="animation-library">
      {(detail.isLoading || detail.isError || !trace) && <Link to={catalogHref} className="text-sm text-primary-500">Back to animations</Link>}
      {detail.isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : detail.isError || !trace ? (
        <div role="alert" className="text-text-secondary">Unable to load this animation. <button className="text-primary-500" onClick={() => void detail.refetch()}>Try again</button></div>
      ) : (
        <AnimationDetail key={selectedId} scene={selectedScene!} catalogHref={catalogHref} />
      )}
    </div>
  );

  return (
    <div className="animation-library animate-fade-in">
      {activeDomain ? <AnimationCategoryHeader domain={activeDomain} count={counts.get(activeDomain.id) ?? 0} loading={list.isLoading} /> : <header className="flex items-start gap-3">
        <PanelsTopLeft size={24} className="text-primary-500 shrink-0 mt-1" aria-hidden="true" />
        <div><h1 className="text-xl md:text-2xl font-bold text-text-primary">Interactive Animations</h1>
          <p className="text-sm text-text-secondary mt-1 max-w-3xl leading-relaxed">High-performance, step-by-step animations for various domains — SQL, System Design, DSA, Concurrency, and more. Explore a category, pick an animation, and learn visually.</p>
        </div>
      </header>}
      <div className="animation-library-categories" role="group" aria-label="Animation categories">
        {[allCategory, ...animationCategories].map(domain => <button key={domain.id} className="animation-library-category" aria-pressed={category === domain.id} onClick={() => chooseCategory(domain.id)}>
          <domain.icon size={20} aria-hidden="true" /><span>{domain.title}<small>{list.isLoading ? 'Loading…' : `${domain.id === 'ALL' ? scenes.length : counts.get(domain.id as typeof animationCategories[number]['id']) ?? 0} animations`}</small></span>
        </button>)}
      </div>
      <div className="animation-library-browse">
        <h2 className="text-lg font-bold text-text-primary">Browse Animations</h2>
        <div className="animation-library-controls">
          <label className="animation-library-search"><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search animations" placeholder={category === 'DATABASE' ? 'Search SQL animations...' : 'Search animations...'} value={term} onChange={event => setTerm(event.target.value)} /></label>
          <select aria-label="Sort animations" value={sort} onChange={event => setSort(event.target.value as AnimationSort)}><option value="name">Title: A–Z</option>{scenes.some(scene => scene.createdAt) && <option value="recent">Recently Added</option>}</select>
        </div>
      </div>
      <p role="status" className="text-xs text-text-secondary">{filtered.length} of {activeDomain ? counts.get(activeDomain.id) ?? 0 : scenes.length} animations</p>
      {list.isLoading ? <div className="flex justify-center py-16"><Spinner size="lg" /></div> : list.isError ? (
        <div role="alert" className="text-sm text-text-secondary">Unable to load animations. <button className="text-primary-500" onClick={() => void list.refetch()}>Try again</button></div>
      ) : filtered.length === 0 ? <EmptyState icon={Boxes} title={scenes.length ? 'No animations found' : 'No animations available yet'} description={scenes.length ? 'Try another search or category to find your next visual lesson.' : 'Published interactive lessons will appear here.'} action={scenes.length > 0 && <button className="text-sm text-primary-500" onClick={reset}>Reset filters</button>} /> : (
        animationCategories.map(domain => {
          const items = filtered.filter(scene => categoryFor(scene).id === domain.id);
          if (!items.length) return null;
          return <section key={domain.id} className="animation-library-section" aria-labelledby={`category-${domain.id}`}>
            <header className="animation-library-section-header"><domain.icon size={20} aria-hidden="true" /><div className="min-w-0"><h3 id={`category-${domain.id}`}>{domain.title}<span className="animation-library-count">{counts.get(domain.id)}</span></h3><p>{domain.description}</p></div>{category === 'ALL' && <button onClick={() => chooseCategory(domain.id)} aria-label={`View all ${domain.title}`}>View all →</button>}</header>
            <div className="animation-library-grid">{items.map(scene => <AnimationLibraryCard key={scene.id} scene={scene} href={sceneHref(scene.id)} />)}</div>
          </section>;
        })
      )}
    </div>
  );
};
