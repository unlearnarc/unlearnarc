import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useMascot } from './MascotContext';
import { MascotAvatar } from './MascotAvatar';
import { BuddySettings } from './BuddySettings';
import './mascot.css';

/** Floating Aria companion. Keep the avatar mounted through every reaction. */
export const CoachBuddy: React.FC = () => {
  const { mood, message, nonce, visible, muted, dismiss, fire, characterId } = useMascot();
  const [menuOpen, setMenuOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const isCelebration = mood === 'celebrate' || mood === 'proud';
  return (
    <div className="ua-mascot" aria-live="polite" ref={rootRef}>
      {menuOpen && (
        <div className="ua-mascot__menu" role="dialog" aria-label="Buddy settings">
          <div className="ua-mascot__menu-head">
            <span>Buddy settings</span>
            <button className="ua-mascot__close" onClick={() => setMenuOpen(false)} aria-label="Close"><X size={12} /></button>
          </div>
          <BuddySettings compact />
          <p className="ua-mascot__menu-hint">Full settings live in your Profile → Study Buddy.</p>
        </div>
      )}
      {visible && message && !menuOpen && (
        <div key={nonce} className="ua-mascot__bubble">
          <button className="ua-mascot__close" onClick={dismiss} aria-label="Dismiss"><X size={12} /></button>
          <p className="ua-mascot__text">{message}</p>
          <span className="ua-mascot__tail" />
        </div>
      )}
      <div className="ua-mascot__dock">
        <button
          className="ua-mascot__avatar"
          onClick={() => fire('WELCOME')}
          onContextMenu={(e) => { e.preventDefault(); setMenuOpen(o => !o); }}
          aria-label="Your study buddy — click to say hi, right-click for settings"
          title="Click to say hi • Right-click for settings"
        >
          <MascotAvatar mood={muted ? 'idle' : mood === 'sleeping' ? 'sleeping' : !visible ? 'idle' : mood} characterId={characterId} nonce={nonce} idle={!muted} />
          {isCelebration && visible && !muted && (
            <span key={`confetti-${nonce}`} className="ua-mascot__confetti" aria-hidden>
              {['🎉', '✨', '⭐️', '🎊'].map((e, i) => <span key={i} style={{ ['--i' as string]: i }}>{e}</span>)}
            </span>
          )}

        </button>
      </div>
    </div>
  );
};
