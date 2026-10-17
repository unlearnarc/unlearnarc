/** Static i18n only: keep older callers source-compatible without translating content. */
export interface TranslateOptions {
  onProgress?: (loaded: number) => void;
  signal?: AbortSignal;
}

export function isTranslatorSupported(): boolean { return false; }

export async function translateText(
  text: string,
  _sourceLanguage: string,
  _targetLanguage: string,
  _opts: TranslateOptions = {},
): Promise<string> {
  return text;
}

export async function translateBatch(
  texts: string[],
  _sourceLanguage: string,
  _targetLanguage: string,
  _opts: TranslateOptions = {},
): Promise<string[]> {
  return texts;
}

export function destroyTranslators(): void { /* No runtime translators. */ }
