import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Workflow, AlertTriangle } from 'lucide-react';
import { animationSceneAPI, algorithmAPI } from '../../api/endpoints';
import { CanvasAnimator } from '../animations';
import { AlgorithmVisualizer } from '../algoviz';
import { Spinner } from '../ui/Spinner';
import type { NoteBlock } from './types';

/**
 * Renders a single embedded visual (animation scene or algorithm visualizer)
 * referenced by slug inside a note. Reuses the exact engines shipped on the
 * Animations / Algorithm pages, so the in-note experience is identical.
 */
export const NoteVisualBlock: React.FC<{ block: NoteBlock }> = ({ block }) => {
  const isAnim = block.kind === 'ANIMATION';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['note-visual', block.kind, block.slug],
    queryFn: () =>
      isAnim ? animationSceneAPI.getBySlug(block.slug) : algorithmAPI.getBySlug(block.slug),
    enabled: !!block.slug,
  });

  const entity = data?.data?.data;

  return (
    <figure className="my-6 rounded-2xl border border-border bg-surface overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border text-xs text-text-muted">
        {isAnim
          ? <Film size={13} className="text-primary-500" />
          : <Workflow size={13} className="text-achievement" />}
        <span className="font-medium text-text-secondary">
          {isAnim ? 'Animation' : 'Algorithm'}
        </span>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="flex justify-center py-12"><Spinner /></div>
        )}
        {isError && (
          <div className="h-24 flex items-center justify-center gap-2 text-xs text-danger">
            <AlertTriangle size={14} /> This visual is unavailable.
          </div>
        )}
        {entity && isAnim && entity.trace && (
          <CanvasAnimator
            key={entity.trace.id}
            traceData={entity.trace}
            autoPlay={false}
            initialSpeed={1}
            showGrid
            showCaption
            showInstructions
          />
        )}
        {entity && !isAnim && <AlgorithmVisualizer algorithm={entity} showCode />}
      </div>

      {block.caption && (
        <figcaption className="px-4 pb-4 text-xs text-text-muted italic text-center">
          {block.caption}
        </figcaption>
      )}
    </figure>
  );
};
