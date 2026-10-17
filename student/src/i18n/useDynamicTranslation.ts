/**
 * Compatibility helpers for source content. Only static locale resources are
 * translated; API-authored titles, questions and lessons remain unchanged.
 * No browser translation API, downloads, subscriptions or network calls.
 */
export interface DynamicTranslationState<T> {
  value: T;
  translating: boolean;
  progress?: number;
  supported: boolean;
}

export function useDynamicTranslation(
  texts: string[],
  _sourceLanguage = 'en',
): DynamicTranslationState<string[]> {
  return { value: texts, translating: false, supported: false };
}

export function useDynamicText(
  text: string,
  _sourceLanguage = 'en',
): DynamicTranslationState<string> {
  return { value: text, translating: false, supported: false };
}
