import { Search } from 'lucide-react';
import type { CatalogSort } from './catalog';
interface Props {
  search: string; category: string; sort: CatalogSort; total: number;
  categories: [string, number][];
  onSearch: (value: string) => void; onCategory: (value: string) => void; onSort: (value: CatalogSort) => void;
}
export function VisualizerToolbar(props: Props) {
  return <div className="visualizer-toolbar">
    <label className="visualizer-search"><Search size={17} aria-hidden="true" />
      <span className="sr-only">Search algorithms</span>
      <input type="search" placeholder="Search algorithms..." value={props.search} onChange={e => props.onSearch(e.target.value)} />
    </label>
    <div className="visualizer-filters" role="group" aria-label="Algorithm categories">
      {([['', props.total], ...props.categories] as [string, number][]).map(([category, count]) =>
        <button key={category} type="button" aria-pressed={props.category === category} onClick={() => props.onCategory(category)}>
          {category || 'All'} <span>{count}</span>
        </button>)}
    </div>
    <label className="visualizer-sort"><span className="sr-only">Sort algorithms</span>
      <select aria-label="Sort algorithms" value={props.sort} onChange={e => props.onSort(e.target.value as CatalogSort)}>
        <option value="name">Name</option><option value="difficulty">Difficulty</option><option value="recent">Recently Added</option>
      </select>
    </label>
  </div>;
}
