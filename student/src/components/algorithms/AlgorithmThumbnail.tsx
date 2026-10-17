import { useState } from 'react';
import type { AlgorithmSummary } from './catalog';

const bundled = new Set(['binary-search', 'linear-search', 'insertion-sort', 'merge-sort', 'quick-sort', 'bubble-sort', 'selection-sort', 'heap-sort', 'bfs', 'dfs', 'balanced-parentheses', 'flood-fill', 'two-pointers']);
function safeImageUrl(value?: string | null) {
  if (!value) return undefined;
  if (/^\/images\/algorithms\/[a-z0-9-]+\.svg$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return value;
  } catch { /* Invalid references use the lightweight local fallback. */ }
  return undefined;
}
export function AlgorithmThumbnail({ algorithm, eager = false }: { algorithm: AlgorithmSummary; eager?: boolean }) {
  const [failed, setFailed] = useState<string[]>([]);
  const custom = safeImageUrl(algorithm.thumbnailUrl);
  const local = bundled.has(algorithm.slug) ? `/images/algorithms/${algorithm.slug}.svg` : undefined;
  const src = [custom, local].find((url): url is string => !!url && !failed.includes(url));
  return <div className="algorithm-thumbnail">
    {src ? <img src={src} alt={`${algorithm.title} algorithm preview`} width={480} height={240}
      loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer"
      onError={() => setFailed(previous => [...previous, src])} /> :
      <svg viewBox="0 0 480 240" role="img" aria-label={`${algorithm.title} visualization preview`}>
        {[60, 100, 80, 130, 110, 150].map((height, index) => <rect key={index} x={72 + index * 56} y={192 - height}
          width="36" height={height} rx="6" fill={index === 2 ? 'var(--ua-primary)' : 'var(--ua-border-strong)'} />)}
        <path d="M72 208H388" stroke="var(--ua-text-secondary)" strokeWidth="2" />
      </svg>}
  </div>;
}
