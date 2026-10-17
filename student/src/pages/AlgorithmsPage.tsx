import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Boxes, Workflow } from 'lucide-react';
import { algorithmAPI } from '../api/endpoints';
import { Spinner } from '../components/ui/Spinner';
import { VisualizerCard } from '../components/algorithms/VisualizerCard';
import { VisualizerToolbar } from '../components/algorithms/VisualizerToolbar';
import { selectAlgorithms, type AlgorithmSummary, type CatalogSort } from '../components/algorithms/catalog';
import './algorithms-list.css';

const EMPTY: AlgorithmSummary[] = [];
export const AlgorithmsPage = () => {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState<CatalogSort>('name');
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ['algorithms', 'published'], queryFn: algorithmAPI.getAll });
  const algorithms: AlgorithmSummary[] = data?.data?.data ?? EMPTY;
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    algorithms.forEach(a => counts.set(a.category || 'Other', (counts.get(a.category || 'Other') ?? 0) + 1));
    return [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [algorithms]);
  const filtered = useMemo(() => selectAlgorithms(algorithms, search, category, sort), [algorithms, search, category, sort]);
  const reset = () => { setSearch(''); setCategory(''); setSort('name'); };
  return <section className="algorithms-list animate-fade-in" aria-labelledby="algorithms-heading">
    <header className="visualizer-list-header">
      <div><h1 id="algorithms-heading"><Workflow size={25} aria-hidden="true" />Algorithm Visualizer</h1>
        <p>Visualize how popular algorithms work step by step. Choose an algorithm, see the execution in action, and build a deeper understanding.</p>
      </div>
    </header>
    <VisualizerToolbar search={search} category={category} sort={sort} total={algorithms.length} categories={categories}
      onSearch={setSearch} onCategory={setCategory} onSort={setSort} />
    <div id="visualizer-results" tabIndex={-1}>
      {isLoading ? <div className="visualizer-list-state" role="status" aria-label="Loading algorithms"><Spinner size="lg" /></div>
        : isError ? <div className="visualizer-list-state" role="alert"><h2>Unable to load algorithms</h2><p>Please try again.</p><button type="button" onClick={() => refetch()}>Try again</button></div>
        : <><div className="visualizer-result-count"><p role="status">{filtered.length} of {algorithms.length} visualizations</p>
          {(search || category || sort !== 'name') && <button type="button" onClick={reset}>Reset filters</button>}</div>
          {filtered.length ? <div className="visualizer-grid">{filtered.map((algorithm, index) => <VisualizerCard key={algorithm.id} algorithm={algorithm} index={index} />)}</div>
            : <div className="visualizer-list-state"><Boxes size={32} aria-hidden="true" /><h2>{algorithms.length ? 'No algorithms found' : 'No visualizations yet'}</h2>
              <p>{algorithms.length ? 'Try a different search or category.' : 'Published algorithms will appear here.'}</p>
              {(search || category) && <button type="button" onClick={reset}>Reset filters</button>}
            </div>}</>}
    </div>
  </section>;
};
