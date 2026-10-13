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

export const LanguageSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <label className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <Languages size={16} className="text-text-muted shrink-0" aria-hidden="true" />
      <span className="sr-only">{t('language.label')}</span>
      <select
        value={current}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="h-9 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-text-primary hover:border-primary-300 focus:outline-none focus:border-primary-400 transition"
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
