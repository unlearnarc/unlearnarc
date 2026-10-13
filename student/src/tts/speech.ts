/* =============================================================================
   speech.ts — a thin, dependency-free wrapper around the browser's built-in
   Web Speech API (window.speechSynthesis). This powers "read aloud" for
   DYNAMIC content (course descriptions, interview stories, problem statements,
   etc.) that cannot live in the static i18n JSON files.

   Everything here runs 100% client-side — no backend, no network, no API keys.

   Key responsibilities:
     • Feature-detect SpeechSynthesis (older/locked-down browsers lack it).
     • Pick the best available voice for the active i18n locale, with graceful
       fallback (exact "ta-IN" → language-only "ta" → default voice).
     • Strip HTML so rich-text stories are read as clean prose.
     • Expose a tiny imperative API (speak / pause / resume / cancel) plus an
       observable "state" so React components can reflect playback status.

   Browser support notes:
     • Chrome/Edge: large voice list, loaded asynchronously → we listen for the
       'voiceschanged' event.
     • Safari: voices available synchronously but Indic/Arabic coverage varies by
       OS. We never throw — if no matching voice exists the default is used.
   ============================================================================= */

export type TtsStatus = 'idle' | 'speaking' | 'paused' | 'unsupported';

export interface TtsState {
  status: TtsStatus;
  /** id of the utterance currently playing, so multiple buttons can show state */
  activeId: string | null;
}

type Listener = (state: TtsState) => void;

/** True when the current environment can speak at all. */
export function isTtsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/* ---- HTML → plain text ------------------------------------------------------
   Dynamic content (interview stories, course blurbs) is often sanitized HTML.
   SpeechSynthesis would literally read the tags, so we flatten to text while
   preserving sentence boundaries (block elements → newlines). */
export function htmlToSpeechText(input: string): string {
  if (!input) return '';
  if (typeof document === 'undefined') {
    return input.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const el = document.createElement('div');
  el.innerHTML = input;
  // Insert newlines after block-level elements so pauses fall naturally.
  el.querySelectorAll('p,div,li,br,h1,h2,h3,h4,h5,h6,tr').forEach((n) => {
    n.append('\n');
  });
  const text = el.textContent ?? '';
  return text.replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
}

class SpeechService {
  private listeners = new Set<Listener>();
  private state: TtsState = {
    status: isTtsSupported() ? 'idle' : 'unsupported',
    activeId: null,
  };
  private voices: SpeechSynthesisVoice[] = [];
  private current: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (!isTtsSupported()) return;
    this.loadVoices();
    // Chrome loads voices asynchronously; refresh when they arrive.
    window.speechSynthesis.addEventListener('voiceschanged', () => this.loadVoices());
    // Some browsers keep a stale queue across HMR / navigation.
    window.addEventListener('beforeunload', () => window.speechSynthesis.cancel());
  }

  private loadVoices() {
    try {
      this.voices = window.speechSynthesis.getVoices();
    } catch {
      this.voices = [];
    }
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    fn(this.state);
    return () => this.listeners.delete(fn);
  }

  getState(): TtsState {
    return this.state;
  }

  private emit(patch: Partial<TtsState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn(this.state));
  }

  /** Pick the closest voice for a BCP-47 locale ("ta-IN", "ar", "en-US"…). */
  private pickVoice(locale: string): SpeechSynthesisVoice | undefined {
    if (!this.voices.length) this.loadVoices();
    const want = locale.toLowerCase();
    const base = want.split('-')[0];
    // 1) exact match  2) language-only match  3) startsWith (e.g. "ta" ~ "ta-IN")
    return (
      this.voices.find((v) => v.lang.toLowerCase() === want) ||
      this.voices.find((v) => v.lang.toLowerCase().split('-')[0] === base) ||
      this.voices.find((v) => v.lang.toLowerCase().startsWith(base))
    );
  }

  /** Does a voice exist for this locale? Used to warn the user up-front. */
  hasVoiceFor(locale: string): boolean {
    return !!this.pickVoice(locale);
  }

  /**
   * Speak `text` in the given `locale`. Cancels anything already playing.
   * `id` lets UI reflect which specific block is being read.
   */
  speak(opts: {
    text: string;
    locale: string;
    id: string;
    rate?: number;
    pitch?: number;
    onEnd?: () => void;
  }) {
    if (!isTtsSupported()) return;
    const { text, locale, id, rate = 1, pitch = 1, onEnd } = opts;
    const clean = text.trim();
    if (!clean) return;

    // Always reset the queue first — Chrome will otherwise stack utterances.
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(clean);
    u.lang = locale;
    u.rate = rate;
    u.pitch = pitch;
    const voice = this.pickVoice(locale);
    if (voice) u.voice = voice;

    u.onstart = () => this.emit({ status: 'speaking', activeId: id });
    u.onend = () => {
      this.current = null;
      this.emit({ status: 'idle', activeId: null });
      onEnd?.();
    };
    u.onerror = () => {
      this.current = null;
      this.emit({ status: 'idle', activeId: null });
    };

    this.current = u;
    window.speechSynthesis.speak(u);
  }

  pause() {
    if (!isTtsSupported() || this.state.status !== 'speaking') return;
    window.speechSynthesis.pause();
    this.emit({ status: 'paused' });
  }

  resume() {
    if (!isTtsSupported() || this.state.status !== 'paused') return;
    window.speechSynthesis.resume();
    this.emit({ status: 'speaking' });
  }

  cancel() {
    if (!isTtsSupported()) return;
    window.speechSynthesis.cancel();
    this.current = null;
    this.emit({ status: 'idle', activeId: null });
  }

  /** Toggle: if this id is playing → stop; otherwise start speaking it. */
  toggle(opts: { text: string; locale: string; id: string; onEnd?: () => void }) {
    if (this.state.activeId === opts.id && this.state.status === 'speaking') {
      this.cancel();
    } else {
      this.speak(opts);
    }
  }
}

/** Singleton — one synthesizer queue per tab. */
export const speechService = new SpeechService();
