import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n';

/* =============================================================================
   LanguageSwitcher — a compact <select> that changes the active UI language.

   react-i18next's changeLanguage() updates every component using useTranslation,
   and the LanguageDetector caches the choice to localStorage('ua_lang').
   Drop this into TopBar, the sidebar, or the profile page.
   ============================================================================= */

export const LanguageSwitcher: React.FC<{ className?: string; compact?: boolean }> = ({ className, compact = false }) => {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <label className={`inline-flex shrink-0 items-center gap-2 ${className ?? ''}`}>
      {!compact && <Languages size={16} className="text-text-muted shrink-0" aria-hidden="true" />}
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={`${compact ? 'w-20 px-1 text-xs' : 'max-w-40 px-2.5 text-sm'} h-9 rounded-[10px] border border-border bg-surface text-text-primary hover:border-primary-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary-400 transition`}
        aria-label={t('language.label')}
      >
        {SUPPORTED_LANGUAGES.map((lng) => (
          <option key={lng.code} value={lng.code}>
            {lng.label}
          </option>
        ))}
      </select>
    </label>
  );
};
