import { useEffect, useRef, useState } from 'react';
import { AriaMascot, type AriaMascotHandle } from './AriaMascot';
import type { MascotState } from './ariaData';
import type { MascotMood } from './messages';

/** Keep the existing event API while using one shared, grounded character. */
const MOOD_STATES: Record<MascotMood, MascotState> = {
  idle: 'happy',
  happy: 'happy',
  celebrate: 'excited',
  encourage: 'sad',
  proud: 'excited',
  thinking: 'thinking',
  wave: 'greeting',
  walking: 'walking',
  sleeping: 'sleeping',
  surprised: 'surprised',
};

export interface MascotAvatarProps {
  mood: MascotMood;
  size?: number;
  /** Legacy IDs are accepted for compatibility; every buddy now renders Aria. */
  characterId?: string;
  nonce?: number;
  idle?: boolean;
}

export function MascotAvatar({ mood, size = 96, nonce = 0, idle = true }: MascotAvatarProps) {
  const mascot = useRef<AriaMascotHandle>(null);
  const [ambient, setAmbient] = useState<MascotState>('happy');
  useEffect(() => {
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    if (mood !== 'idle' || !idle || media.matches) return;
    // Walk in place without moving the floating button's hit target.
    const sequence: [MascotState, number][] = [['happy', 8000], ['walking', 5000], ['happy', 14000], ['thinking', 5000], ['happy', 20000], ['sleeping', 8000]];
    let step = 0;
    let timer: ReturnType<typeof setTimeout>;
    const advance = () => {
      timer = setTimeout(() => {
        step = (step + 1) % sequence.length;
        setAmbient(sequence[step][0]);
        advance();
      }, sequence[step][1]);
    };
    timer = setTimeout(() => { setAmbient('happy'); advance(); }, 0);
    const changed = () => {
      clearTimeout(timer);
      setAmbient('happy');
      step = 0;
      if (!media.matches) advance();
    };
    media.addEventListener('change', changed);
    return () => { clearTimeout(timer); media.removeEventListener('change', changed); };
  }, [mood, idle]);
  const state = mood === 'idle' && idle ? ambient : MOOD_STATES[mood];
  useEffect(() => {
    // Replay repeated reactions without remounting or replacing live SVG paths.
    mascot.current?.transitionTo(state);
  }, [state, nonce]);
  return (
    <span style={{ display: 'inline-block', width: size, height: size * 1.25 }}>
      <AriaMascot ref={mascot} currentState={state} idle={idle} label={`Aria is ${mood}`} />
    </span>
  );
}
