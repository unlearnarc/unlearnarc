import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { animationSceneAPI } from '../../api/endpoints';
import { Modal } from '../../components/ui/Modal';
import { AnimationPreview } from '../../components/animations/AnimationPreview';
import type { AnimationScene } from '../../types/animation';

interface Props {
  sceneId: string | null;
  onClose: () => void;
}

export const ScenePreviewModal: React.FC<Props> = ({ sceneId, onClose }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['anim-scene', sceneId],
    queryFn: () => animationSceneAPI.getById(sceneId!),
    enabled: !!sceneId,
  });
  const scene: AnimationScene | null = data?.data?.data ?? null;

  return (
    <Modal
      open={!!sceneId}
      title={scene ? `Preview — ${scene.title}` : 'Preview'}
      onClose={onClose}
      size="lg"
    >
      <div className="max-h-[78vh] overflow-y-auto">
        {isLoading || !scene || !scene.trace ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            Loading scene…
          </div>
        ) : (
          <>
            {scene.description && (
              <p className="text-sm text-slate-400 mb-4 border-l-2 border-violet-500/50 pl-3">
                {scene.description}
              </p>
            )}
            <AnimationPreview trace={scene.trace} autoPlay />
          </>
        )}
      </div>
    </Modal>
  );
};
