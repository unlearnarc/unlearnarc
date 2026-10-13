/* =============================================================================
   i18n bootstrap — react-i18next + browser language detection.

   • Resources are statically imported so they are bundled & type-safe. For a
     large app you can switch to i18next-http-backend for lazy loading, but for
     a handful of namespaces static import keeps it simple and fast.
   • Detection order: localStorage('ua_lang') → <html lang> → navigator. The
     chosen language is cached back to localStorage so it survives reloads.
   • `supportedLngs` + `load:'languageOnly'` means "en-US" resolves to "en".
   ============================================================================= */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import hi from './locales/hi.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import ar from './locales/ar.json';
import ta from './locales/ta.json';
import ml from './locales/ml.json';
import te from './locales/te.json';
import kn from './locales/kn.json';

/** Languages written right-to-left. Used to flip <html dir> and layout. */
export const RTL_LANGUAGES = ['ar', 'he', 'fa', 'ur'] as const;

export function isRtlLanguage(lng: string): boolean {
  // Normalise "ar-EG" → "ar" before checking.
  const base = lng.split('-')[0];
  return (RTL_LANGUAGES as readonly string[]).includes(base);
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'ar', label: 'العربية' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

export const resources = {
  en: { translation: en },
  hi: { translation: hi },
  es: { translation: es },
  fr: { translation: fr },
  ar: { translation: ar },
  ta: { translation: ta },
  ml: { translation: ml },
  te: { translation: te },
  kn: { translation: kn },
} as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    load: 'languageOnly',
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'htmlTag', 'navigator'],
      lookupLocalStorage: 'ua_lang',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

// Keep <html lang="…"> and text direction in sync for a11y / RTL support.
export function applyDocumentDirection(lng: string): void {
  if (typeof document === 'undefined') return;
  const dir = isRtlLanguage(lng) ? 'rtl' : 'ltr';
  const root = document.documentElement;
  root.setAttribute('lang', lng);
  root.setAttribute('dir', dir);
  // `data-dir` on <body> lets CSS/Tailwind target direction without :dir() quirks.
  document.body?.setAttribute('data-dir', dir);
}

i18n.on('languageChanged', applyDocumentDirection);

// Apply once on load for the detected language (before any languageChanged fires).
applyDocumentDirection(i18n.resolvedLanguage || i18n.language || 'en');

export default i18n;
