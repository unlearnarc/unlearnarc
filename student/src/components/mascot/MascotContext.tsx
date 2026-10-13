import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  REACTIONS,
  pickLine,
  type MascotEvent,
  type MascotMood,
  type MascotVibe,
} from './messages';
import { CHARACTERS, getCharacter } from './characters';
import { useAuth } from '../../context/AuthContext';
import { userAuthAPI } from '../../api/endpoints';

/* =============================================================================
   MascotContext — global event bus for Coach Buddy.

   Any component can call `const { fire } = useMascot()` then
   `fire('CORRECT_ANSWER')` to make the buddy react.

   Adds:
   - character selection (girl / boy / cat / robot), persisted
   - vibe selection (supportive friend / warm companion), persisted
   - an idle-nudge timer so the buddy checks in after a quiet stretch
   - correct-answer streak auto-upgrade
   ============================================================================= */

interface MascotState {
  mood: MascotMood;
  message: string;
  nonce: number;       // bumped per fire() to re-trigger animations
  visible: boolean;
}

interface MascotContextValue extends MascotState {
  fire: (event: MascotEvent) => void;
  muted: boolean;
  toggleMuted: () => void;
  dismiss: () => void;
  // personalization
  characterId: string;
  setCharacterId: (id: string) => void;
  vibe: MascotVibe;
  setVibe: (v: MascotVibe) => void;
}

const MUTE_KEY = 'ua_mascot_muted';
const CHAR_KEY = 'ua_mascot_char';
const VIBE_KEY = 'ua_mascot_vibe';
const STREAK_THRESHOLD = 3;
const IDLE_NUDGE_MS = 90_000; // 1.5 min of quiet → a gentle check-in

const MascotContext = createContext<MascotContextValue | null>(null);

export const MascotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateUser, isAuthenticated } = useAuth();

  const [state, setState] = useState<MascotState>({
    mood: 'idle',
    message: '',
    nonce: 0,
    visible: false,
  });

  const [muted, setMuted] = useState<boolean>(
    () => localStorage.getItem(MUTE_KEY) === '1',
  );
  const [characterId, setCharacterIdState] = useState<string>(() => {
    const saved = localStorage.getItem(CHAR_KEY);
    return saved && CHARACTERS.some(c => c.id === saved) ? saved : CHARACTERS[0].id;
  });
  const [vibe, setVibeState] = useState<MascotVibe>(
    () => (localStorage.getItem(VIBE_KEY) === 'companion' ? 'companion' : 'friend'),
  );

  const streakRef = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vibeRef = useRef(vibe);
  vibeRef.current = vibe;
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const dismiss = useCallback(() => {
    setState(s => ({ ...s, visible: false }));
  }, []);

  // Persist a preference patch to the backend (best-effort) and update the
  // cached auth profile so other components stay in sync. localStorage is
  // written synchronously by the setters for instant UX / offline fallback.
  const persistPrefs = useCallback(
    (patch: { character?: string; vibe?: MascotVibe; muted?: boolean }) => {
      if (!isAuthenticated) return;
      updateUser({
        ...(patch.character !== undefined ? { mascotCharacter: patch.character } : {}),
        ...(patch.vibe !== undefined ? { mascotVibe: patch.vibe } : {}),
        ...(patch.muted !== undefined ? { mascotMuted: patch.muted } : {}),
      });
      userAuthAPI.updateMascot(patch).catch(() => {
        /* best-effort: localStorage already holds the change as a fallback */
      });
    },
    [isAuthenticated, updateUser],
  );


  const scheduleIdleNudge = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (mutedRef.current) return;
      const reaction = REACTIONS.IDLE_NUDGE;
      setState(s => ({
        mood: reaction.mood,
        message: pickLine('IDLE_NUDGE', vibeRef.current),
        nonce: s.nonce + 1,
        visible: true,
      }));
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(
        () => setState(s => ({ ...s, visible: false })),
        reaction.duration,
      );
    }, IDLE_NUDGE_MS);
  }, []);

  const show = useCallback((event: MascotEvent) => {
    const reaction = REACTIONS[event];
    setState(s => ({
      mood: reaction.mood,
      message: pickLine(event, vibeRef.current),
      nonce: s.nonce + 1,
      visible: true,
    }));

    if (hideTimer.current) clearTimeout(hideTimer.current);
    if (reaction.duration > 0) {
      hideTimer.current = setTimeout(
        () => setState(s => ({ ...s, visible: false })),
        reaction.duration,
      );
    }
    scheduleIdleNudge();
  }, [scheduleIdleNudge]);

  const fire = useCallback(
    (event: MascotEvent) => {
      if (mutedRef.current) return;

      if (event === 'CORRECT_ANSWER') {
        streakRef.current += 1;
        if (streakRef.current >= STREAK_THRESHOLD) {
          streakRef.current = 0;
          show('STREAK');
          return;
        }
      } else if (event === 'WRONG_ANSWER') {
        streakRef.current = 0;
      }

      show(event);
    },
    [show],
  );

  const toggleMuted = useCallback(() => {
    setMuted(m => {
      const next = !m;
      localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      if (next) {
        setState(s => ({ ...s, visible: false }));
        if (idleTimer.current) clearTimeout(idleTimer.current);
      }
      persistPrefs({ muted: next });
      return next;
    });
  }, [persistPrefs]);

  const setCharacterId = useCallback((id: string) => {
    const char = getCharacter(id);
    setCharacterIdState(char.id);
    localStorage.setItem(CHAR_KEY, char.id);
    persistPrefs({ character: char.id });
    // instant preview reaction so the switch feels alive
    if (!mutedRef.current) {
      setState(s => ({
        mood: 'wave',
        message: pickLine('WELCOME', vibeRef.current),
        nonce: s.nonce + 1,
        visible: true,
      }));
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(
        () => setState(s => ({ ...s, visible: false })),
        3500,
      );
    }
  }, [persistPrefs]);

  const setVibe = useCallback((v: MascotVibe) => {
    setVibeState(v);
    localStorage.setItem(VIBE_KEY, v);
    persistPrefs({ vibe: v });
  }, [persistPrefs]);

  // ── Hydrate from the server profile (preferences persisted in the backend) ──
  // When the authenticated user's profile loads (or changes), adopt their saved
  // buddy / vibe / mute. localStorage still acts as an instant/offline cache.
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (!user || hydratedRef.current) return;
    hydratedRef.current = true;
    if (user.mascotCharacter && CHARACTERS.some(c => c.id === user.mascotCharacter)) {
      setCharacterIdState(user.mascotCharacter);
      localStorage.setItem(CHAR_KEY, user.mascotCharacter);
    }
    if (user.mascotVibe === 'friend' || user.mascotVibe === 'companion') {
      setVibeState(user.mascotVibe);
      localStorage.setItem(VIBE_KEY, user.mascotVibe);
    }
    if (typeof user.mascotMuted === 'boolean') {
      setMuted(user.mascotMuted);
      localStorage.setItem(MUTE_KEY, user.mascotMuted ? '1' : '0');
    }
  }, [user]);

  // greet once on mount + start the idle timer
  useEffect(() => {
    const t = setTimeout(() => fire('WELCOME'), 800);
    return () => {
      clearTimeout(t);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MascotContext.Provider
      value={{
        ...state,
        fire,
        muted,
        toggleMuted,
        dismiss,
        characterId,
        setCharacterId,
        vibe,
        setVibe,
      }}
    >
      {children}
    </MascotContext.Provider>
  );
};

export function useMascot(): MascotContextValue {
  const ctx = useContext(MascotContext);
  if (!ctx) throw new Error('useMascot must be used within a MascotProvider');
  return ctx;
}
