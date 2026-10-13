/* =============================================================================
   TtsContext — global on/off switch for "read aloud" (text-to-speech).

   The toggle lives in the Profile page but the preference is needed everywhere
   (every SpeakButton must hide itself when the feature is off). We therefore
   expose it via context, persist it to localStorage for instant/offline UX, and
   best-effort sync it to the backend profile (mirrors how MascotContext stores
   its prefs — no new backend contract is strictly required client-side).

   Playback status (idle / speaking / paused) is surfaced from the singleton
   speechService so any component can subscribe without prop-drilling.
   ============================================================================= */

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from 'react';
import { useAuth } from '../context/AuthContext';
import { speechService, isTtsSupported, type TtsState } from './speech';

const TTS_KEY = 'ua_tts_enabled';

interface TtsContextValue {
  /** User has switched the feature on (and the browser supports it). */
  enabled: boolean;
  /** The browser can actually speak. False → the toggle explains why it's off. */
  supported: boolean;
  setEnabled: (on: boolean) => void;
  toggleEnabled: () => void;
  /** Live playback state (idle/speaking/paused/unsupported) + active block id. */
  playback: TtsState;
}

const TtsCtx = createContext<TtsContextValue | null>(null);

export const TtsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const supported = isTtsSupported();

  // Try the backend-hydrated user flag first, then localStorage, default off.
  const { user, isAuthenticated } = useAuth();
  const [enabled, setEnabledState] = useState<boolean>(
    () => supported && localStorage.getItem(TTS_KEY) === '1',
  );

  // Subscribe to the singleton's playback status with the concurrent-safe hook.
  const playback = useSyncExternalStore(
    (cb) => speechService.subscribe(() => cb()),
    () => speechService.getState(),
    () => speechService.getState(),
  );

  // Hydrate from the server profile once it loads (ttsEnabled is optional).
  const hydrated = React.useRef(false);
  useEffect(() => {
    if (!user || hydrated.current) return;
    hydrated.current = true;
    if (typeof user.ttsEnabled === 'boolean') {
      const next = supported && user.ttsEnabled;
      setEnabledState(next);
      localStorage.setItem(TTS_KEY, next ? '1' : '0');
    }
  }, [user, supported]);

  const persist = useCallback(
    (next: boolean) => {
      localStorage.setItem(TTS_KEY, next ? '1' : '0');
      // Best-effort backend sync; never block the UI on it. Guarded so the app
      // works purely client-side if the endpoint isn't present yet.
      if (isAuthenticated) {
        import('../api/endpoints')
          .then(({ userAuthAPI }) => {
            userAuthAPI.updateTts?.({ ttsEnabled: next })?.catch?.(() => {});
          })
          .catch(() => {});
      }
    },
    [isAuthenticated],
  );

  const setEnabled = useCallback(
    (on: boolean) => {
      const next = supported && on;
      setEnabledState(next);
      persist(next);
      if (!next) speechService.cancel(); // stop any in-flight narration
    },
    [supported, persist],
  );

  const toggleEnabled = useCallback(() => setEnabled(!enabled), [enabled, setEnabled]);

  // Safety: if the feature is turned off anywhere, make sure nothing keeps talking.
  useEffect(() => {
    if (!enabled) speechService.cancel();
  }, [enabled]);

  return (
    <TtsCtx.Provider value={{ enabled, supported, setEnabled, toggleEnabled, playback }}>
      {children}
    </TtsCtx.Provider>
  );
};

export function useTtsContext(): TtsContextValue {
  const ctx = useContext(TtsCtx);
  if (!ctx) throw new Error('useTtsContext must be used within a TtsProvider');
  return ctx;
}
