// ─────────────────────────────────────────────────────────────────────────────
// Persistent WASM/asset cache.
//
// This is the "install once per machine/browser" layer. It uses the Cache API
// (same storage backend used by service workers) which:
//   • survives page reloads, tab closes and browser restarts
//   • is keyed per-origin, so it is naturally scoped to this app
//   • holds hundreds of MB comfortably (unlike localStorage)
//   • returns real Response objects we can stream for progress UI
//
// Runs inside the WORKER (Cache API is available in workers). The cache key
// embeds the asset version, so bumping a manifest version transparently
// invalidates stale copies.
// ─────────────────────────────────────────────────────────────────────────────

import type { RuntimeAsset } from './types';

const CACHE_NAME = 'ua-wasm-runtime-v1';

function cacheKeyFor(asset: RuntimeAsset): string {
  // Version-pinned key => a version bump never collides with an old copy.
  return `${asset.url}?__v=${encodeURIComponent(asset.version)}`;
}

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface FetchProgress {
  loaded: number;
  total: number;
  fromCache: boolean;
}

/**
 * Returns the asset bytes, downloading + persisting on first use and serving
 * from the local cache on every subsequent use. Streams progress for the UI.
 */
export async function getAsset(
  asset: RuntimeAsset,
  onProgress?: (p: FetchProgress) => void,
): Promise<ArrayBuffer> {
  const cache = await caches.open(CACHE_NAME);
  const key = cacheKeyFor(asset);

  // 1. Fast path: already installed on this machine.
  const cached = await cache.match(key);
  if (cached) {
    const buf = await cached.arrayBuffer();
    onProgress?.({ loaded: buf.byteLength, total: buf.byteLength, fromCache: true });
    return buf;
  }

  // 2. Cold path: download once, stream progress, verify, then persist.
  const res = await fetch(asset.url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok || !res.body) {
    throw new Error(`Failed to download ${asset.id}: HTTP ${res.status}`);
  }

  const total =
    Number(res.headers.get('content-length')) || asset.sizeBytes || 0;

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress?.({ loaded, total: total || loaded, fromCache: false });
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  const buffer = bytes.buffer;

  // 3. Optional integrity enforcement.
  if (asset.integrity?.startsWith('sha256-')) {
    const expected = asset.integrity.slice('sha256-'.length).toLowerCase();
    const actual = await sha256Hex(buffer);
    if (actual !== expected) {
      throw new Error(
        `Integrity check failed for ${asset.id}: expected ${expected}, got ${actual}`,
      );
    }
  }

  // 4. Persist for every future run on this machine.
  await cache.put(
    key,
    new Response(buffer.slice(0), {
      headers: {
        'content-type':
          res.headers.get('content-type') ?? 'application/octet-stream',
        'content-length': String(loaded),
      },
    }),
  );

  return buffer;
}

/** Returns a same-origin blob: URL backed by the cached asset (for importScripts). */
export async function getAssetObjectURL(
  asset: RuntimeAsset,
  onProgress?: (p: FetchProgress) => void,
): Promise<string> {
  const buf = await getAsset(asset, onProgress);
  return URL.createObjectURL(new Blob([buf]));
}

/** True if every asset of a runtime is already installed locally. */
export async function isRuntimeInstalled(assets: RuntimeAsset[]): Promise<boolean> {
  if (assets.length === 0) return true;
  const cache = await caches.open(CACHE_NAME);
  const matches = await Promise.all(
    assets.map(a => cache.match(cacheKeyFor(a))),
  );
  return matches.every(Boolean);
}

/** Wipe the whole runtime cache (e.g. a "reset environment" button). */
export async function clearRuntimeCache(): Promise<void> {
  await caches.delete(CACHE_NAME);
}

/** Rough installed-bytes estimate via the Storage API. */
export async function estimateCacheUsage(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}
