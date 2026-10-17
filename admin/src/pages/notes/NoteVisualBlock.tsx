import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Film, Workflow, AlertTriangle } from 'lucide-react';
import { animationSceneAPI, algorithmAPI } from '../../api/endpoints';
import { AlgorithmVisualizer } from '../../components/algoviz/AlgorithmVisualizer';
import { AnimationPreview } from '../../components/animations/AnimationPreview';
import type { NoteBlock } from './types';

/**
 * Renders a single embedded visual (animation scene or algorithm visualizer)
 * referenced by slug. Used by the note preview so admins see exactly what a
 * learner will see. Fetches the referenced entity lazily by slug.
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
    <figure className="my-6 rounded-xl border border-white/10 bg-black/30 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8 text-xs text-slate-400">
        {isAnim ? <Film size={13} className="text-violet-400" /> : <Workflow size={13} className="text-cyan-400" />}
        <span className="font-medium">{isAnim ? 'Animation' : 'Algorithm'}</span>
        <span className="text-slate-600">·</span>
        <span className="truncate">{block.slug}</span>
      </div>

      <div className="p-3">
        {isLoading && <div className="h-40 flex items-center justify-center text-xs text-slate-500">Loading visual…</div>}
        {isError && (
          <div className="h-24 flex items-center justify-center gap-2 text-xs text-rose-400">
            <AlertTriangle size={14} /> Could not load “{block.slug}”. Is it published?
          </div>
        )}
        {entity && isAnim && entity.trace && (
          <AnimationPreview trace={entity.trace} />
        )}
        {entity && isAnim && !entity.trace && (
          <div className="h-24 flex items-center justify-center text-xs text-slate-500">
            This scene has no stored trace to preview.
          </div>
        )}
        {entity && !isAnim && <AlgorithmVisualizer algorithm={entity} showCode />}
      </div>

      {block.caption && (
        <figcaption className="px-3 pb-3 text-xs text-slate-400 italic">{block.caption}</figcaption>
      )}
    </figure>
  );
};
