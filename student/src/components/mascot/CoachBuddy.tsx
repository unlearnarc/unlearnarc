import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { useMascot } from './MascotContext';
import { MascotLottie } from './MascotLottie';
import { BuddySettings } from './BuddySettings';
import './mascot.css';

/* =============================================================================
   CoachBuddy — the floating motivational companion, fixed bottom-right.
   - Reads reactive state from MascotContext.
   - Pops a speech bubble + reacts (pop / bounce / wave / heartbeat) per mood.
   - LEFT-click  → the buddy waves hi.
   - RIGHT-click → a small context menu with buddy settings (character / vibe /
     mute). The full settings also live on the Profile page.
   Mount ONCE near the app root (inside MascotProvider).
   ============================================================================= */

export const CoachBuddy: React.FC = () => {
  const {
    mood, message, nonce, visible, muted, dismiss, fire,
    characterId, vibe,
  } = useMascot();

  const [animKey, setAnimKey] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setAnimKey((k) => k + 1), [nonce]);

  // Close the context menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isCelebration = mood === 'celebrate' || mood === 'proud';
  const isWave = mood === 'wave';
  const isLove = mood === 'love' || vibe === 'companion';

  return (
    <div className="ua-mascot" aria-live="polite" ref={rootRef}>
      {/* Right-click context menu with quick settings */}
      {menuOpen && (
        <div className="ua-mascot__menu" role="dialog" aria-label="Buddy settings">
          <div className="ua-mascot__menu-head">
            <span>Buddy settings</span>
            <button
              className="ua-mascot__close"
              onClick={() => setMenuOpen(false)}
              aria-label="Close"
            >
              <X size={12} />
            </button>
          </div>
          <BuddySettings compact />
          <p className="ua-mascot__menu-hint">
            Full settings live in your Profile → Study Buddy.
          </p>
        </div>
      )}

      {/* Speech bubble */}
      {visible && message && !menuOpen && (
        <div key={animKey} className="ua-mascot__bubble">
          <button className="ua-mascot__close" onClick={dismiss} aria-label="Dismiss">
            <X size={12} />
          </button>
          <p className="ua-mascot__text">{message}</p>
          <span className="ua-mascot__tail" />
        </div>
      )}

      {/* Avatar */}
      <div className="ua-mascot__dock">
        <button
          key={animKey}
          className={clsx(
            'ua-mascot__avatar',
            visible && !muted && 'ua-mascot__avatar--react',
            isCelebration && visible && 'ua-mascot__avatar--celebrate',
            isWave && visible && 'ua-mascot__avatar--wave',
            isLove && visible && 'ua-mascot__avatar--love',
          )}
          onClick={() => fire('WELCOME')}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenuOpen((o) => !o);
          }}
          aria-label="Your study buddy — click to say hi, right-click for settings"
          title="Click to say hi • Right-click for settings"
        >
          <MascotLottie
            mood={muted ? 'idle' : mood}
            characterId={characterId}
            nonce={nonce}
          />

          {isCelebration && visible && (
            <span className="ua-mascot__confetti" aria-hidden>
              {'🎉✨⭐️🎊'.split('').map((e, i) => (
                <span key={i} style={{ ['--i' as string]: i }}>{e}</span>
              ))}
            </span>
          )}

          {isLove && visible && !muted && (
            <span className="ua-mascot__hearts" aria-hidden>
              {['💛', '💖', '💕'].map((e, i) => (
                <span key={i} style={{ ['--i' as string]: i }}>{e}</span>
              ))}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
