import React from 'react';
import { Volume2, VolumeX, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTtsContext } from '../../tts/TtsContext';
import { speechService } from '../../tts/speech';

/* =============================================================================
   TtsSettings — the master on/off switch for "read aloud", shown on the Profile
   page alongside the Study Buddy settings. Reads/writes the TtsContext.

   • When the browser can't speak, the toggle is disabled with an explanation.
   • When on but no voice exists for the active language, we surface a soft hint
     (the feature still works, just with the default system voice).
   ============================================================================= */

export const TtsSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { enabled, supported, toggleEnabled } = useTtsContext();

  const locale = i18n.resolvedLanguage || i18n.language || 'en';
  const hasVoice = speechService.hasVoiceFor(locale);

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Volume2 size={16} className="text-primary-500" />
        <h2 className="text-sm font-semibold text-text-primary">{t('tts.title')}</h2>
      </div>

      <p className="text-xs text-text-muted">{t('tts.description')}</p>

      <button
        type="button"
        onClick={toggleEnabled}
        disabled={!supported}
        aria-pressed={enabled}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-[10px] bg-bg-soft hover:bg-surface-soft transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="flex items-center gap-3">
          {enabled ? (
            <Volume2 size={18} className="text-primary-500" />
          ) : (
            <VolumeX size={18} className="text-text-muted" />
          )}
          <span className="text-sm font-medium text-text-primary">
            {enabled ? t('tts.enabled') : t('tts.disabled')}
          </span>
        </span>

        {/* Switch track */}
        <span
          className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition ${
            enabled ? 'bg-primary-500' : 'bg-border'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              enabled ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      {!supported && (
        <p className="flex items-start gap-2 text-xs text-warning">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {t('tts.unsupported')}
        </p>
      )}

      {supported && enabled && !hasVoice && (
        <p className="flex items-start gap-2 text-xs text-text-muted">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {t('tts.noVoiceHint')}
        </p>
      )}
    </div>
  );
};
