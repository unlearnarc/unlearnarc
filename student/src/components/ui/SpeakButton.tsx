import React from 'react';
import clsx from 'clsx';
import { Volume2, Square, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSpeak } from '../../tts/useSpeak';

/* =============================================================================
   SpeakButton — the single reusable "read aloud" control for DYNAMIC content.

   Drop it next to any server-driven text (course blurbs, interview stories,
   problem statements, algorithm explanations) and it will:
     • render ONLY when the user enabled TTS in Profile AND the browser supports it
     • speak the text in the currently-selected i18n language
     • toggle to a "stop" state while playing
     • announce itself to screen readers via aria-label

   Props:
     text   — the raw string to read (plain or HTML — set `html` accordingly)
     id     — a STABLE unique id for this block (so only one plays at a time)
     html   — true if `text` contains markup that must be stripped first
     label  — optional visible label (icon-only by default to stay compact)
   ============================================================================= */

interface SpeakButtonProps {
  text: string;
  id: string;
  html?: boolean;
  label?: boolean;
  size?: number;
  className?: string;
}

export const SpeakButton: React.FC<SpeakButtonProps> = ({
  text,
  id,
  html = false,
  label = false,
  size = 16,
  className,
}) => {
  const { t } = useTranslation();
  const { available, hasVoice, speak, isActive, isSpeaking } = useSpeak(text, id, { html });

  // Feature off / unsupported / nothing to read → render nothing.
  if (!available) return null;

  const title = isActive
    ? t('tts.stop')
    : hasVoice
      ? t('tts.listen')
      : t('tts.noVoice');

  return (
    <button
      type="button"
      onClick={speak}
      title={title}
      aria-label={title}
      aria-pressed={isActive}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition',
        isActive
          ? 'bg-primary-500 text-white'
          : 'bg-primary-50 text-primary-600 hover:bg-primary-100',
        !hasVoice && !isActive && 'opacity-70',
        className,
      )}
    >
      {isSpeaking ? (
        <Square size={size} className="fill-current" />
      ) : isActive ? (
        <Loader2 size={size} className="animate-spin" />
      ) : (
        <Volume2 size={size} />
      )}
      {label && <span>{isActive ? t('tts.stop') : t('tts.listen')}</span>}
    </button>
  );
};
