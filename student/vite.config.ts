import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Bundle the sandbox worker as an ES module so `new Worker(new URL(...))` works
  // in dev and in the production build.
  worker: {
    format: 'es',
  },
  // Pyodide pulls in Node-y shims; keep it out of Vite's dep pre-bundling.
  optimizeDeps: {
    exclude: ['pyodide'],
  },
  server: {
    port: 3002,
    // Fail loudly if 3002 is taken instead of silently moving to 3003 — a
    // stray server on the wrong port breaks the COEP/isolation expectations
    // and makes Pyodide appear "not loaded".
    strictPort: true,
    // Bind ALL interfaces (IPv4 0.0.0.0 + IPv6) so BOTH http://127.0.0.1:3002
    // and http://[::1]:3002 accept connections. Vite with host:'127.0.0.1'
    // (or default) was binding IPv6-only ([::1]), so http://127.0.0.1:3002
    // was refused (ECONNREFUSED) while http://localhost:3002 resolved to [::1]
    // and got swallowed by the corporate HTTP proxy (127.0.0.1:3128 → 503).
    // 127.0.0.1 IS in the system no_proxy list, so reaching the app via
    // http://127.0.0.1:3002 bypasses the proxy entirely.
    host: '0.0.0.0',
    // COOP/COEP make the page cross-origin isolated, which unlocks
    // SharedArrayBuffer — required for Pyodide's threaded WASM runtime.
    //
    // CRITICAL: under COEP `require-corp`, EVERY subresource fetch (including
    // same-origin fetches made from a worker — e.g. Pyodide fetching its own
    // .wasm/.zip, or our assetCache downloading them) is BLOCKED unless the
    // response carries a Cross-Origin-Resource-Policy header. Without it the
    // fetch fails with an opaque `TypeError: Failed to fetch` and Pyodide never
    // boots. `same-origin` is enough since we self-host every asset.
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
    proxy: {
      // Use 127.0.0.1 so Vite's own proxy forwarding bypasses the corporate
      // HTTP proxy (which 503s `localhost`). Matches api/client.ts base URL.
      '/api': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
      },
      '/oauth2': {
        target: 'http://127.0.0.1:8085',
        changeOrigin: true,
      },
    },
  },
  preview: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
  },
});
