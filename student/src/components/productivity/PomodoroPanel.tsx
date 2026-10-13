import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Pause, RotateCcw, SkipForward, Settings2, Flame, Check } from 'lucide-react';
import clsx from 'clsx';
import { usePomodoro, type Phase } from './usePomodoro';
import { usePomodoroStats } from './hooks';

/* =============================================================================
   PomodoroPanel — the focus timer UI.

   A circular SVG progress ring wraps a large mm:ss readout. Phase tabs let the
   user jump between Focus / Short break / Long break. A collapsible settings
   drawer tweaks durations and behaviour. Today's completed-session count and the
   all-time focus total come from the shared stats store.
   ============================================================================= */

const PHASES: { id: Phase; key: string }[] = [
  { id: 'focus', key: 'productivity.pomodoro.focus' },
  { id: 'short', key: 'productivity.pomodoro.shortBreak' },
  { id: 'long', key: 'productivity.pomodoro.longBreak' },
];

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export const PomodoroPanel: React.FC = () => {
  const { t } = useTranslation();
  const pomo = usePomodoro();
  const { todayCount, stats } = usePomodoroStats();
  const [showSettings, setShowSettings] = useState(false);

  const R = 86;
  const C = 2 * Math.PI * R;
  const ringColor =
    pomo.phase === 'focus' ? 'var(--ua-primary-500)' : 'var(--ua-success)';

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Phase tabs */}
      <div className="inline-flex p-1 rounded-full bg-surface-soft">
        {PHASES.map((p) => (
          <button
            key={p.id}
            onClick={() => pomo.switchPhase(p.id)}
            className={clsx(
              'px-3.5 py-1.5 rounded-full text-xs font-medium transition',
              pomo.phase === p.id
                ? 'bg-surface text-text-primary shadow-[var(--ua-shadow-card)]'
                : 'text-text-muted hover:text-text-secondary',
            )}
          >
            {t(p.key)}
          </button>
        ))}
      </div>

      {/* Ring + time */}
      <div className="relative w-[216px] h-[216px]">
        <svg viewBox="0 0 216 216" className="w-full h-full -rotate-90">
          <circle cx="108" cy="108" r={R} fill="none" stroke="var(--ua-surface-soft)" strokeWidth="12" />
          <circle
            cx="108"
            cy="108"
            r={R}
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - pomo.progress)}
            style={{ transition: 'stroke-dashoffset .3s linear' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold tabular-nums text-text-primary">
            {fmt(pomo.remaining)}
          </span>
          <span className="mt-1 text-xs font-medium text-text-muted uppercase tracking-wide">
            {t(PHASES.find((p) => p.id === pomo.phase)!.key)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={pomo.reset}
          className="w-11 h-11 rounded-full border border-border text-text-secondary hover:bg-surface-soft transition flex items-center justify-center"
          aria-label={t('productivity.pomodoro.reset')}
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={pomo.running ? pomo.pause : pomo.start}
          className="w-16 h-16 rounded-full bg-primary-500 text-white hover:bg-primary-600 transition flex items-center justify-center shadow-[var(--ua-shadow-hover)]"
          aria-label={pomo.running ? t('productivity.pomodoro.pause') : t('productivity.pomodoro.start')}
        >
          {pomo.running ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        <button
          onClick={pomo.skip}
          className="w-11 h-11 rounded-full border border-border text-text-secondary hover:bg-surface-soft transition flex items-center justify-center"
          aria-label={t('productivity.pomodoro.skip')}
        >
          <SkipForward size={18} />
        </button>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-6 text-center">
        <div>
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-text-primary">
            <Check size={16} className="text-success" />
            {todayCount}
          </div>
          <div className="text-[11px] text-text-muted">{t('productivity.pomodoro.today')}</div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div>
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-text-primary">
            <Flame size={16} className="text-warning" />
            {Math.round(stats.totalFocusMinutes / 60)}h
          </div>
          <div className="text-[11px] text-text-muted">{t('productivity.pomodoro.totalFocus')}</div>
        </div>
      </div>

      {/* Settings toggle */}
      <button
        onClick={() => setShowSettings((v) => !v)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-primary-500 transition"
      >
        <Settings2 size={14} />
        {t('productivity.pomodoro.settings')}
      </button>

      {showSettings && (
        <div className="w-full max-w-sm rounded-[12px] border border-border bg-surface p-4 space-y-3">
          <NumberRow
            label={t('productivity.pomodoro.focusMinutes')}
            value={pomo.settings.focusMinutes}
            min={1}
            max={120}
            onChange={(v) => pomo.setSettings({ focusMinutes: v })}
          />
          <NumberRow
            label={t('productivity.pomodoro.shortBreakMinutes')}
            value={pomo.settings.shortBreakMinutes}
            min={1}
            max={60}
            onChange={(v) => pomo.setSettings({ shortBreakMinutes: v })}
          />
          <NumberRow
            label={t('productivity.pomodoro.longBreakMinutes')}
            value={pomo.settings.longBreakMinutes}
            min={1}
            max={60}
            onChange={(v) => pomo.setSettings({ longBreakMinutes: v })}
          />
          <NumberRow
            label={t('productivity.pomodoro.sessionsBeforeLong')}
            value={pomo.settings.sessionsBeforeLongBreak}
            min={1}
            max={10}
            onChange={(v) => pomo.setSettings({ sessionsBeforeLongBreak: v })}
          />
          <ToggleRow
            label={t('productivity.pomodoro.autoStart')}
            checked={pomo.settings.autoStartNext}
            onChange={(v) => pomo.setSettings({ autoStartNext: v })}
          />
          <ToggleRow
            label={t('productivity.pomodoro.sound')}
            checked={pomo.settings.soundEnabled}
            onChange={(v) => pomo.setSettings({ soundEnabled: v })}
          />
        </div>
      )}
    </div>
  );
};

const NumberRow: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <label className="text-sm text-text-secondary">{label}</label>
    <div className="inline-flex items-center rounded-[8px] border border-border overflow-hidden">
      <button
        className="w-8 h-8 text-text-secondary hover:bg-surface-soft transition"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="decrease"
      >
        −
      </button>
      <span className="w-10 text-center text-sm font-medium tabular-nums text-text-primary">
        {value}
      </span>
      <button
        className="w-8 h-8 text-text-secondary hover:bg-surface-soft transition"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="increase"
      >
        +
      </button>
    </div>
  </div>
);

const ToggleRow: React.FC<{
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, checked, onChange }) => (
  <div className="flex items-center justify-between gap-3">
    <label className="text-sm text-text-secondary">{label}</label>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative w-10 h-6 rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-surface-soft border border-border',
      )}
    >
      <span
        className={clsx(
          'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  </div>
);
