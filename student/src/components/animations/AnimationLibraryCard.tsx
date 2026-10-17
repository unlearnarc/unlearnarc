import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock3, Layers } from 'lucide-react';
import { categoryFor, safeThumbnail, type SceneSummary } from './catalog';

/** Static, theme-aware concept diagrams: no player, timers, or trace downloads. */
function ConceptPreview({ scene }: { scene: SceneSummary }) {
  const key = `${scene.slug} ${scene.kind} ${scene.title}`.toLowerCase();
  const domain = categoryFor(scene).id;
  const box = (x: number, y: number, label: string, active = false, width = 74) => (
    <g key={`${x}-${y}`}><rect x={x} y={y} width={width} height="32" rx="5" fill={active ? 'var(--ua-primary-soft)' : 'var(--ua-surface)'} stroke={active ? 'var(--ua-primary)' : 'var(--ua-border-strong)'} /><text x={x + width / 2} y={y + 20} textAnchor="middle" fill="var(--ua-text-primary)" stroke="none" fontSize="11">{label}</text></g>
  );
  const line = (x: number, y: number, x2: number, y2: number) => <path key={`${x}-${y}-${x2}`} d={`M${x} ${y} L${x2} ${y2}`} />;
  let diagram;
  if (/index|tree|bfs|dfs|graph/.test(key)) {
    diagram = <>{[[180, 35, 100, 80], [180, 35, 260, 80], [100, 80, 60, 125], [100, 80, 140, 125], [260, 80, 220, 125], [260, 80, 300, 125]].map(p => line(p[0], p[1], p[2], p[3]))}{[[180, 35], [100, 80], [260, 80], [60, 125], [140, 125], [220, 125], [300, 125]].map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="14" fill={i < 3 ? 'var(--ua-primary-soft)' : 'var(--ua-surface)'} /><text x={x} y={y + 4} textAnchor="middle" stroke="none" fill="var(--ua-text-primary)" fontSize="11">{i + 1}</text></g>)}</>;
  } else if (/merge|sort/.test(key)) {
    diagram = <>{line(180, 50, 95, 85)}{line(180, 50, 265, 85)}{line(95, 110, 180, 140)}{line(265, 110, 180, 140)}{box(125, 20, '8   3   6   1', true, 110)}{box(50, 78, '3   8', false, 90)}{box(220, 78, '1   6', false, 90)}{box(125, 130, '1   3   6   8', true, 110)}</>;
  } else if (/search|two.sum|array/.test(key)) {
    diagram = <>{[2, 5, 8, 12, 16, 23, 38].map((n, i) => box(22 + i * 46, 70, String(n), i === 3, 40))}<path d="M180 42 v20 m-5 -5 5 5 5 -5" /><text x="180" y="32" textAnchor="middle" stroke="none" fill="var(--ua-primary)" fontSize="11">{/two.sum/.test(key) ? 'Compare values' : 'Midpoint'}</text></>;
  } else if (domain === 'DATABASE') {
    const filter = /where|filter/.test(key);
    const group = /group|aggregate/.test(key);
    diagram = <>{box(32, 28, group ? 'Records' : 'Table A', false, 100)}{box(228, 28, filter ? 'Result' : group ? 'Groups' : 'Table B', false, 100)}{[0, 1, 2].map(i => <g key={i}>{box(32, 65 + i * 28, `${i + 1}   ·   ${['Ada', 'Lin', 'Sam'][i]}`, i === 1, 100)}{box(228, 65 + i * 28, `${i + 1}   ·   ${group ? 'SUM' : 'row'}`, i === 1, 100)}</g>)}{line(136, 106, 224, 106)}<text x="180" y="90" textAnchor="middle" stroke="none" fill="var(--ua-primary)" fontSize="10">{filter ? 'WHERE' : group ? 'GROUP BY' : 'JOIN'}</text></>;
  } else if (domain === 'AI_ML') {
    diagram = <>{[45, 90, 135].flatMap(y => [60, 120].map(y2 => line(75, y, 180, y2)))}{[60, 120].map(y => line(180, y, 285, 90))}{[[75, 45], [75, 90], [75, 135], [180, 60], [180, 120], [285, 90]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="15" fill="var(--ua-primary-soft)" />)}</>;
  } else {
    const cache = /cach/.test(key);
    const queue = /queue/.test(key);
    const concurrent = domain === 'CONCURRENCY';
    const labels = concurrent ? ['Thread A', /atomic|cas/.test(key) ? 'CAS' : 'Lock', 'Thread B'] : cache ? ['App', 'Cache', 'Database'] : queue ? ['Producer', 'Queue', 'Consumer'] : ['Client', 'Router', 'Server'];
    diagram = <>{line(100, 90, 143, 90)}{line(217, 90, 260, 90)}{box(20, 74, labels[0], false, 80)}{box(143, 74, labels[1], true)}{box(260, 74, labels[2], false, 80)}{!cache && !queue && !concurrent && <>{line(180, 74, 290, 35)}{line(180, 106, 290, 145)}{box(260, 15, 'Server', false, 80)}{box(260, 130, 'Server', false, 80)}</>}</>;
  }
  return <svg viewBox="0 0 360 180" aria-hidden="true" fill="none" stroke="var(--ua-primary)" strokeWidth="1.5">{diagram}</svg>;
}

export function AnimationLibraryCard({ scene, href }: { scene: SceneSummary; href: string }) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const thumbnail = safeThumbnail(scene.thumbnailUrl);
  const category = categoryFor(scene);
  return (
    <Link to={href} className="animation-library-card" aria-label={`Watch ${scene.title}`}>
      <div className="animation-library-preview">
        {thumbnail && failedUrl !== thumbnail ? <img src={thumbnail} alt="" loading="lazy" onError={() => setFailedUrl(thumbnail)} /> : <ConceptPreview scene={scene} />}
      </div>
      <div className="animation-library-card-body">
        <h4>{scene.title}</h4>
        <p className="animation-library-description">{scene.description || category.description}</p>
        <span className="animation-library-badge">{category.title}</span>
        <div className="animation-library-card-footer">
          <span className="animation-library-metadata">
            {typeof scene.duration === 'number' && Number.isFinite(scene.duration) && <span><Clock3 size={13} aria-hidden="true" />{(scene.duration / 1000).toFixed(1)}s</span>}
            {typeof scene.keyframeCount === 'number' && <span><Layers size={13} aria-hidden="true" />{scene.keyframeCount} frames</span>}
          </span>
          <span className="animation-library-watch">Watch <ArrowRight size={14} aria-hidden="true" /></span>
        </div>
      </div>
    </Link>
  );
}
