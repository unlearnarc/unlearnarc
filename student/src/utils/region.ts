/**
 * Region helpers for the profile region picker + leaderboard.
 *
 * Two ways a user's region gets set:
 *  1. Manual — they pick from `REGION_OPTIONS` in the profile form.
 *  2. Automatic — if they grant the browser Geolocation permission, we reverse
 *     geocode their coordinates into an ISO country code via a free, keyless API.
 *
 * We deliberately store a short ISO-3166 alpha-2 country code (e.g. "IN", "US")
 * so manual and auto-detected values are consistent and the region leaderboard
 * groups cleanly.
 */

export interface RegionOption {
  code: string;   // ISO alpha-2, stored on the user
  label: string;  // human-friendly name for the dropdown
}

/** Curated shortlist shown in the dropdown. Extend freely. */
export const REGION_OPTIONS: RegionOption[] = [
  { code: 'IN', label: 'India' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'CA', label: 'Canada' },
  { code: 'AU', label: 'Australia' },
  { code: 'DE', label: 'Germany' },
  { code: 'FR', label: 'France' },
  { code: 'SG', label: 'Singapore' },
  { code: 'JP', label: 'Japan' },
  { code: 'BR', label: 'Brazil' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'NG', label: 'Nigeria' },
  { code: 'ZA', label: 'South Africa' },
];

/** Resolve a stored code back to its label (falls back to the raw code). */
export function regionLabel(code?: string | null): string {
  if (!code) return 'Not set';
  const match = REGION_OPTIONS.find((r) => r.code === code.toUpperCase());
  return match ? match.label : code;
}

export type GeoDetectResult =
  | { ok: true; code: string; label: string }
  | { ok: false; reason: 'unsupported' | 'denied' | 'unavailable' | 'timeout' };

/**
 * Detect the user's region via the browser Geolocation API + a free reverse
 * geocoder (BigDataCloud — keyless, CORS-enabled, no sign-up).
 *
 * Returns a discriminated result rather than throwing, so the caller can show
 * a precise message ("permission denied", "unavailable", etc.).
 */
export async function detectRegionFromBrowser(): Promise<GeoDetectResult> {
  if (!('geolocation' in navigator)) {
    return { ok: false, reason: 'unsupported' };
  }

  const position = await new Promise<GeolocationPosition | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 600_000 },
    );
  });

  if (!position) {
    // getCurrentPosition's error could be denial, unavailability, or timeout.
    // We can't tell them apart from the resolve(null) above cheaply, so probe
    // the Permissions API when available for a more specific reason.
    const reason = await inferGeoFailureReason();
    return { ok: false, reason };
  }

  const { latitude, longitude } = position.coords;

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
    );
    if (!res.ok) return { ok: false, reason: 'unavailable' };
    const data: { countryCode?: string; countryName?: string } = await res.json();
    const code = (data.countryCode ?? '').toUpperCase();
    if (!code) return { ok: false, reason: 'unavailable' };
    return { ok: true, code, label: data.countryName ?? regionLabel(code) };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

async function inferGeoFailureReason(): Promise<'denied' | 'unavailable' | 'timeout'> {
  try {
    if ('permissions' in navigator) {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'denied') return 'denied';
    }
  } catch {
    /* Permissions API not supported — fall through. */
  }
  return 'unavailable';
}
