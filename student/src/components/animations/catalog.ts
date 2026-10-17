import { Boxes, Database, GitFork, Network, BrainCircuit, Layers, Workflow } from 'lucide-react';

export interface SceneSummary {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  category?: string;
  source?: string;
  kind?: string;
  keyframeCount?: number | null;
  duration?: number | null;
  thumbnailUrl?: string | null;
  createdAt?: string | null;
}

export const animationCategories = [
  { id: 'DATABASE', title: 'SQL / Database', icon: Database, description: 'Visualize how SQL queries, joins, indexes, and database concepts work.' },
  { id: 'DSA', title: 'DSA / Graphs', icon: GitFork, description: 'Visualize core data structures and algorithms step by step.' },
  { id: 'SYSTEM_DESIGN', title: 'System Design', icon: Network, description: 'Visualize real-world system design concepts and architectural flows.' },
  { id: 'AI_ML', title: 'AI / ML', icon: BrainCircuit, description: 'Understand machine learning concepts and model workflows visually.' },
  { id: 'CONCURRENCY', title: 'Concurrency', icon: Workflow, description: 'Explore threads, synchronization, and concurrent execution.' },
  { id: 'OTHER', title: 'Other', icon: Boxes, description: 'Discover additional interactive technical explanations.' },
] as const;
export const allCategory = { id: 'ALL', title: 'All Animations', icon: Layers };
export type LibraryCategory = typeof animationCategories[number]['id'];
export type AnimationSort = 'name' | 'recent';
export function categoryFor(scene: SceneSummary) {
  return animationCategories.find(category => category.id === scene.category) ?? animationCategories[5];
}
export function selectScenes(scenes: SceneSummary[], query: string, category: string, sort: AnimationSort) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return scenes.filter(scene => {
    const domain = categoryFor(scene);
    const text = [scene.title, scene.description, scene.category, scene.kind, domain.title, domain.description].join(' ').toLowerCase();
    return (category === 'ALL' || domain.id === category) && words.every(word => text.includes(word));
  }).sort((a, b) => {
    if (sort === 'recent') {
      const date = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
      const difference = date(b.createdAt) - date(a.createdAt);
      if (difference) return difference;
    }
    return a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
  });
}
export function safeThumbnail(url?: string | null): string | undefined {
  if (!url) return;
  if (/^\/images\/[a-zA-Z0-9/_-]+\.(svg|png|webp|jpe?g)$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return url;
  } catch { /* Fall back to a local diagram. */ }
}
