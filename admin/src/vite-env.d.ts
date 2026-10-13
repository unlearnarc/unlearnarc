/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin (no trailing /api/v1). Set on Vercel to the Render URL. */
  readonly VITE_API_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
