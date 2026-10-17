import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { AlgorithmThumbnail } from './AlgorithmThumbnail';
import type { AlgorithmSummary } from './catalog';

export function VisualizerCard({ algorithm, index }: { algorithm: AlgorithmSummary; index: number }) {
  return <Link to={`/algorithms/${algorithm.slug}`} className="visualizer-card">
    <AlgorithmThumbnail key={`${algorithm.id}:${algorithm.thumbnailUrl ?? ''}`} algorithm={algorithm} eager={index < 3} />
    <div className="visualizer-card-body">
      <div className="visualizer-card-heading"><h2>{algorithm.title}</h2>
        {algorithm.difficulty && <Badge label={algorithm.difficulty} className="visualizer-difficulty" />}
      </div>
      <p>{algorithm.summary || `Explore ${algorithm.title} step by step.`}</p>
      <span className="visualizer-category">{algorithm.category || 'Other'}</span>
      <span className="visualizer-card-action">Open visualizer <ArrowRight size={16} aria-hidden="true" className="ua-flip-rtl" /></span>
    </div>
  </Link>;
}
