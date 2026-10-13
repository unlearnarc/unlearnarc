import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Brain, Play, Square, Timer, Moon, Volume2, VolumeX } from 'lucide-react';
import clsx from 'clsx';
import { LinkPicker, LinkBadge } from './LinkPicker';
import { read, write, uid } from './storage';
import type { LinkRef } from './types';

/* =============================================================================
   FocusPanel — "Deep Learning / Deep Work" mode.

   Starts a distraction-free, full-bleed focus session optionally bound to a
   course/topic. While a session runs it shows an elapsed timer, an ambient
   breathing animation and a gentle "stay on task" affirmation. Finished sessions
   are logged (duration + link) so learners can see where their deep-work hours
   went. Ambient sound is a soft synthesized brown-noise-ish tone (optional).
   ============================================================================= */

interface FocusLog {
  id: string;
  startedAt: number;
  minutes: number;
  link?: LinkRef;
}

function useAmbientNoise(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let ctx: AudioContext | null = null;
    let src: AudioBufferSourceNode | null = null;
    let gain: GainNode | null = null;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctx();
      const bufferSize = 2 * ctx.sampleRate;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let last = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        last = (last + 0.02 * white) / 1.02;
        data[i] = last * 3.5;
      }
      src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      gain = ctx.createGain();
      gain.gain.value = 0.06;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start();
    } catch {
      /* audio unavailable */
    }
    return () => {
      try {
        src?.stop();
        ctx?.close();
      } catch {
        /* ignore */
      }
    };
  }, [enabled]);
}

export const FocusPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [running, setRunning] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [link, setLink] = useState<LinkRef | undefined>();
  const [sound, setSound] = useState(false);
  const [logs, setLogs] = useState<FocusLog[]>(() => read<FocusLog[]>('focus_logs', []));

  useAmbientNoise(running && sound);

  useEffect(() => {
    if (!running || startedAt == null) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [running, startedAt]);

  const start = () => {
    setStartedAt(Date.now());
    setElapsed(0);
    setRunning(true);
  };

  const stop = () => {
    if (startedAt != null) {
      const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
      const entry: FocusLog = { id: uid(), startedAt, minutes, link };
      const next = [entry, ...read<FocusLog[]>('focus_logs', [])].slice(0, 50);
      write('focus_logs', next);
      setLogs(next);
    }
    setRunning(false);
    setStartedAt(null);
    setElapsed(0);
  };

  const totalHours = useMemo(
    () => Math.round((logs.reduce((s, l) => s + l.minutes, 0) / 60) * 10) / 10,
    [logs],
  );

  const hh = String(Math.floor(elapsed / 3600)).padStart(2, '0');
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center text-center min-h-[60vh] gap-8">
        {/* Breathing orb */}
        <div className="relative flex items-center justify-center">
          <span className="absolute w-48 h-48 rounded-full bg-primary-500/10 animate-ping" />
          <span className="absolute w-36 h-36 rounded-full bg-primary-500/15" style={{ animation: 'ua-breathe 6s ease-in-out infinite' }} />
          <div className="relative w-28 h-28 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
            <Brain size={40} />
          </div>
        </div>

        <div>
          <div className="text-5xl font-bold tabular-nums text-text-primary">
            {hh !== '00' ? `${hh}:` : ''}{mm}:{ss}
          </div>
          <p className="mt-2 text-sm text-text-muted">{t('productivity.focus.staying')}</p>
          {link && (
            <div className="mt-3 flex justify-center">
              <LinkBadge link={link} />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSound((s) => !s)}
            className="w-11 h-11 rounded-full border border-border text-text-secondary hover:bg-surface-soft transition flex items-center justify-center"
            aria-label={t('productivity.focus.sound')}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            onClick={stop}
            className="inline-flex items-center gap-2 px-5 h-12 rounded-full bg-danger text-white font-medium hover:bg-[var(--ua-danger-hover)] transition"
          >
            <Square size={18} />
            {t('productivity.focus.end')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero / intro */}
      <div className="rounded-[16px] bg-[var(--ua-gradient-hero)] border border-border p-6 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-primary-500/15 items-center justify-center text-primary-500 mb-3">
          <Moon size={26} />
        </span>
        <h3 className="text-lg font-bold text-text-primary">{t('productivity.focus.heroTitle')}</h3>
        <p className="mt-1.5 text-sm text-text-secondary max-w-md mx-auto">
          {t('productivity.focus.heroDesc')}
        </p>

        <div className="mt-5 max-w-sm mx-auto flex flex-col items-center gap-3">
          <div className="w-full flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5">
            <span className="text-sm text-text-secondary">{t('productivity.focus.linkLabel')}</span>
            <LinkPicker value={link} onChange={setLink} />
          </div>
          <label className="w-full flex items-center justify-between rounded-[10px] border border-border bg-surface px-3 py-2.5">
            <span className="text-sm text-text-secondary inline-flex items-center gap-2">
              <Volume2 size={15} className="text-text-muted" />
              {t('productivity.focus.ambient')}
            </span>
            <button
              role="switch"
              aria-checked={sound}
              onClick={() => setSound((s) => !s)}
              className={clsx('relative w-10 h-6 rounded-full transition-colors', sound ? 'bg-primary-500' : 'bg-surface-soft border border-border')}
            >
              <span className={clsx('absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', sound ? 'translate-x-[18px]' : 'translate-x-0.5')} />
            </button>
          </label>
          <button
            onClick={start}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-primary-500 text-white font-semibold hover:bg-primary-600 transition shadow-[var(--ua-shadow-hover)]"
          >
            <Play size={18} />
            {t('productivity.focus.start')}
          </button>
        </div>
      </div>

      {/* Totals + recent logs */}
      <div className="flex items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3">
        <Timer size={18} className="text-primary-500" />
        <span className="text-sm text-text-secondary">
          {t('productivity.focus.totalDeepWork')}
        </span>
        <span className="ml-auto text-sm font-bold text-text-primary">{totalHours}h</span>
      </div>

      {logs.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
            {t('productivity.focus.recent')}
          </h4>
          <ul className="space-y-1.5">
            {logs.slice(0, 8).map((l) => (
              <li
                key={l.id}
                className="flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3 py-2 text-sm"
              >
                <span className="font-medium text-text-primary">{l.minutes} {t('common.minutes')}</span>
                {l.link && <LinkBadge link={l.link} />}
                <span className="ml-auto text-xs text-text-muted">
                  {new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(l.startedAt))}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
