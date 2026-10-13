/* =============================================================================
   Lottie manifest — maps character + mood to animation file URLs under
   /public/mascot. Files are OPTIONAL: if none exist the component falls back
   to the inline-SVG avatar, so you can add .lottie files incrementally.

   Lookup order for a given (characterId, mood):
     1. /mascot/<id>.<mood>.lottie   (mood-specific, richest)
     2. /mascot/<id>.lottie          (character base loop)
     3/4. .json variants

   IMPORTANT — SPA fallback guard:
   A Vite/React dev (and prod) server serves index.html for ANY unknown path
   with HTTP 200. A naive `HEAD` check therefore reports EVERY candidate as
   "exists", so we'd feed index.html to the Lottie player and render a broken
   character. We guard against this by rejecting responses whose content-type
   is HTML — a real Lottie asset is never served as text/html.
   ============================================================================= */

import type { MascotMood } from './messages';

const BASE = `${import.meta.env.BASE_URL ?? '/'}mascot`;

export function lottieCandidates(characterId: string, mood: MascotMood): string[] {
  return [
    `${BASE}/${characterId}.${mood}.lottie`,
    `${BASE}/${characterId}.lottie`,
    `${BASE}/${characterId}.${mood}.json`,
    `${BASE}/${characterId}.json`,
  ];
}

/* Module-level cache of which URLs resolve to a REAL asset, so we don't
   re-probe the network on every mood change. true = real file, false = missing
   or SPA-fallback HTML. */
const existenceCache = new Map<string, boolean>();

/** A genuine Lottie asset is JSON (.json) or a dotLottie zip (.lottie); it is
    never served as HTML. The SPA fallback returns text/html, which we reject. */
function looksLikeRealAsset(res: Response): boolean {
  if (!res.ok) return false;
  const type = (res.headers.get('content-type') ?? '').toLowerCase();
  if (type.includes('text/html')) return false; // SPA index.html fallback
  return true;
}

export async function firstExisting(urls: string[]): Promise<string | null> {
  for (const url of urls) {
    const cached = existenceCache.get(url);
    if (cached === true) return url;
    if (cached === false) continue;
    try {
      // GET (not HEAD): some static servers don't set content-type on HEAD.
      const res = await fetch(url, { method: 'GET', cache: 'force-cache' });
      const ok = looksLikeRealAsset(res);
      existenceCache.set(url, ok);
      if (ok) return url;
    } catch {
      existenceCache.set(url, false);
    }
  }
  return null;
}
