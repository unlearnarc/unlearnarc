/* =============================================================================
   Locale-aware formatting helpers (the "localisation" half of i18n).

   Translating strings is only part of the job — numbers, dates, currencies and
   relative times must also follow the active locale. These wrap the native
   Intl.* APIs (zero dependencies) and read the current language from i18next.
   ============================================================================= */

import i18n from './index';

function currentLocale(): string {
  return i18n.resolvedLanguage || i18n.language || 'en';
}

export function formatNumber(value: number, opts?: Intl.NumberFormatOptions): string {
  return new Intl.NumberFormat(currentLocale(), opts).format(value);
}

export function formatDate(
  value: Date | string | number,
  opts: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(currentLocale(), opts).format(d);
}

export function formatDateTime(value: Date | string | number): string {
  return formatDate(value, { dateStyle: 'medium', timeStyle: 'short' });
}

/** "in 3 days", "2 hours ago", etc. */
export function formatRelativeTime(value: Date | string | number): string {
  const d = value instanceof Date ? value : new Date(value);
  const diffMs = d.getTime() - Date.now();
  const rtf = new Intl.RelativeTimeFormat(currentLocale(), { numeric: 'auto' });

  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 1000 * 60 * 60 * 24 * 365],
    ['month', 1000 * 60 * 60 * 24 * 30],
    ['day', 1000 * 60 * 60 * 24],
    ['hour', 1000 * 60 * 60],
    ['minute', 1000 * 60],
    ['second', 1000],
  ];

  for (const [unit, ms] of units) {
    if (Math.abs(diffMs) >= ms || unit === 'second') {
      return rtf.format(Math.round(diffMs / ms), unit);
    }
  }
  return rtf.format(0, 'second');
}
