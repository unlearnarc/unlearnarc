/* =============================================================================
   useSpeak — bridges the i18n active locale with the speechService so callers
   don't have to know the current language. Returns everything a "read aloud"
   control needs for ONE block of dynamic text.

   Usage:
     const { speak, isActive, status, available } = useSpeak(storyHtml, 'exp-42', { html: true });
   ============================================================================= */

import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useTtsContext } from './TtsContext';
import { speechService, htmlToSpeechText } from './speech';

interface UseSpeakOptions {
  /** Treat the source as HTML and strip tags before speaking. */
  html?: boolean;
}

export function useSpeak(source: string, id: string, opts: UseSpeakOptions = {}) {
  const { i18n } = useTranslation();
  const { enabled, supported, playback } = useTtsContext();

  // i18next exposes the resolved BCP-47-ish tag (e.g. "ta", "ar", "en").
  // Map to a slightly richer regional tag where the OS voices expect it.
  const locale = useMemo(() => {
    const lng = i18n.resolvedLanguage || i18n.language || 'en';
    const REGIONAL: Record<string, string> = {
      ta: 'ta-IN', ml: 'ml-IN', te: 'te-IN', kn: 'kn-IN',
      hi: 'hi-IN', ar: 'ar-SA', en: 'en-US', es: 'es-ES', fr: 'fr-FR',
    };
    return REGIONAL[lng.split('-')[0]] ?? lng;
  }, [i18n.resolvedLanguage, i18n.language]);

  const text = useMemo(
    () => (opts.html ? htmlToSpeechText(source) : source),
    [source, opts.html],
  );

  const isActive = playback.activeId === id && playback.status !== 'idle';
  const isSpeaking = isActive && playback.status === 'speaking';

  const speak = useCallback(() => {
    if (!enabled || !supported) return;
    speechService.toggle({ text, locale, id });
  }, [enabled, supported, text, locale, id]);

  const stop = useCallback(() => speechService.cancel(), []);

  return {
    /** Should the control be rendered at all? (feature on + browser capable + text present) */
    available: enabled && supported && text.trim().length > 0,
    /** Is a voice installed for the current locale? (false → warn/hint) */
    hasVoice: speechService.hasVoiceFor(locale),
    speak,
    stop,
    isActive,
    isSpeaking,
    status: playback.status,
    locale,
  };
}
