import React, { useEffect, useRef, useState } from 'react';
import { DotLottieReact, type DotLottie } from '@lottiefiles/dotlottie-react';
import { MascotAvatar } from './MascotAvatar';
import { lottieCandidates, firstExisting } from './lottieManifest';
import type { MascotMood } from './messages';

/* =============================================================================
   MascotLottie — renders a Lottie animation for the active character/mood when
   a matching file exists under /public/mascot, otherwise transparently falls
   back to the inline-SVG MascotAvatar. Same props as MascotAvatar so it's a
   drop-in upgrade.

   Behaviour:
   - Resolves the best Lottie file for (characterId, mood) via a HEAD probe.
   - Idle, walking, sleeping and thinking loop; other reactions play once.
   - The `nonce` prop forces a replay when the same mood re-fires.
   ============================================================================= */

const LOOPING: MascotMood[] = ['idle', 'walking', 'sleeping', 'thinking'];

export const MascotLottie: React.FC<{
  mood: MascotMood;
  characterId?: string;
  size?: number;
  nonce?: number;
}> = ({ mood, characterId = 'luna', size = 72, nonce = 0 }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const dotRef = useRef<DotLottie | null>(null);

  useEffect(() => {
    let alive = true;
    setFailed(false);
    firstExisting(lottieCandidates(characterId, mood)).then(url => {
      if (!alive) return;
      if (url) setSrc(url);
      else { setSrc(null); setFailed(true); }
    });
    return () => { alive = false; };
  }, [characterId, mood]);

  // Replay one-shot reactions when a new event fires (nonce bump).
  useEffect(() => {
    const dot = dotRef.current;
    if (!dot) return;
    try {
      dot.stop();
      dot.play();
    } catch { /* player not ready yet */ }
  }, [nonce, src]);

  if (failed || !src) {
    return <MascotAvatar mood={mood} characterId={characterId} size={size} />;
  }

  return (
    <DotLottieReact
      key={src}
      dotLottieRefCallback={(d) => { dotRef.current = d; }}
      src={src}
      autoplay
      loop={LOOPING.includes(mood)}
      style={{ width: size, height: size }}
      onError={() => setFailed(true)}
    />
  );
};
