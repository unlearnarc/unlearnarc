import React from 'react';
import clsx from 'clsx';
import { Check, Volume2, VolumeX } from 'lucide-react';
import { useMascot } from './MascotContext';
import { MascotAvatar } from './MascotAvatar';
import { CHARACTERS } from './characters';
import type { MascotVibe } from './messages';

/* =============================================================================
   BuddySettings — reusable control panel for picking the companion character,
   the personality vibe (Buddy / Companion) and mute. Rendered in two places:
     • the Profile page (primary home for settings)
     • the right-click context menu on the floating character (quick access)
   `compact` tightens spacing for the context-menu usage.
   ============================================================================= */

const VIBES: { id: MascotVibe; label: string; emoji: string; hint: string }[] = [
  { id: 'friend',    label: 'Buddy',     emoji: '🙌', hint: 'Supportive friend' },
  { id: 'companion', label: 'Companion', emoji: '🌱', hint: 'Calm & encouraging' },
];

export const BuddySettings: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { characterId, setCharacterId, vibe, setVibe, muted, toggleMuted } = useMascot();

  return (
    <div className={clsx('ua-buddy-settings', compact && 'ua-buddy-settings--compact')}>
      <div className="ua-buddy-settings__section">
        <span className="ua-buddy-settings__label">Your study buddy</span>
        <div className="ua-buddy-settings__grid">
          {CHARACTERS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={clsx('ua-buddy-settings__char', characterId === c.id && 'is-active')}
              onClick={() => setCharacterId(c.id)}
              title={c.tagline}
            >
              <MascotAvatar mood="happy" size={compact ? 42 : 54} characterId={c.id} idle={false} />
              <span className="ua-buddy-settings__char-name">{c.name}</span>
              {characterId === c.id && <Check size={12} className="ua-buddy-settings__check" />}
            </button>
          ))}
        </div>
      </div>

      <div className="ua-buddy-settings__section">
        <span className="ua-buddy-settings__label">Personality</span>
        <div className="ua-buddy-settings__vibes">
          {VIBES.map((v) => (
            <button
              key={v.id}
              type="button"
              className={clsx('ua-buddy-settings__vibe', vibe === v.id && 'is-active')}
              onClick={() => setVibe(v.id)}
            >
              <span className="ua-buddy-settings__vibe-top">
                <span aria-hidden>{v.emoji}</span> {v.label}
              </span>
              {!compact && <span className="ua-buddy-settings__vibe-hint">{v.hint}</span>}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        className="ua-buddy-settings__mute"
        onClick={toggleMuted}
      >
        {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        {muted ? 'Buddy is muted — tap to unmute' : 'Buddy reactions are on'}
      </button>
    </div>
  );
};
