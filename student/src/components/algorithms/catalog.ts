import type { Algorithm } from '../algoviz';

/** List responses intentionally exclude the execution spec and source code. */
export type AlgorithmSummary = Pick<Algorithm, 'id' | 'slug' | 'title' | 'summary' | 'category' | 'difficulty' | 'visualizer' | 'complexity' | 'thumbnailUrl' | 'createdAt'>;
export type CatalogSort = 'name' | 'difficulty' | 'recent';
const difficulty = { EASY: 0, MEDIUM: 1, HARD: 2 };
export function selectAlgorithms(items: AlgorithmSummary[], search: string, category: string, sort: CatalogSort) {
  const terms = search.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  return items.filter(a => (!category || (a.category || 'Other') === category) && terms.every(term =>
    [a.title, a.summary, a.category, a.slug, a.difficulty, a.visualizer, JSON.stringify(a.complexity ?? {})]
      .filter(Boolean).join(' ').toLocaleLowerCase().includes(term)
  )).sort((a, b) => {
    if (sort === 'difficulty') {
      const delta = (difficulty[a.difficulty!] ?? 3) - (difficulty[b.difficulty!] ?? 3);
      if (delta) return delta;
    }
    if (sort === 'recent') {
      const delta = (Date.parse(b.createdAt ?? '') || 0) - (Date.parse(a.createdAt ?? '') || 0);
      if (delta) return delta;
    }
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}
