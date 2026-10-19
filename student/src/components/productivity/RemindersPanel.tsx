import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, BellRing, Bell, Clock, Repeat } from 'lucide-react';
import clsx from 'clsx';
import { EmptyState } from '../ui/EmptyState';
import { LinkPicker, LinkBadge } from './LinkPicker';
import { useReminders } from './hooks';
import type { LinkRef, Reminder } from './types';
import { NotificationSettings } from '../../pwa/NotificationSettings';

/* =============================================================================
   RemindersPanel — schedule time-based nudges, optionally tied to a course/topic.

   The composer takes a title, a datetime-local value and a repeat cadence. Due
   reminders are delivered by the app-wide scheduler (useReminderScheduler); this
   panel only manages the list. Past/fired reminders are visually de-emphasised.
   ============================================================================= */

const REPEATS: { id: Reminder['repeat']; key: string }[] = [
  { id: 'NONE', key: 'productivity.reminders.once' },
  { id: 'DAILY', key: 'productivity.reminders.daily' },
  { id: 'WEEKLY', key: 'productivity.reminders.weekly' },
];

/** Default the datetime picker to one hour from now, local tz, trimmed to minutes. */
function defaultWhen(): string {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
}

export const RemindersPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { reminders, add, remove } = useReminders();

  const [title, setTitle] = useState('');
  const [when, setWhen] = useState<string>(defaultWhen());
  const [repeat, setRepeat] = useState<Reminder['repeat']>('NONE');
  const [link, setLink] = useState<LinkRef | undefined>();

  const fmt = (ts: number) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(ts));

  const submit = () => {
    const at = new Date(when).getTime();
    if (!title.trim() || Number.isNaN(at)) return;
    add({ title: title.trim(), at, repeat, link });
    setTitle('');
    setWhen(defaultWhen());
    setRepeat('NONE');
    setLink(undefined);
  };

  return (
    <div className="space-y-5">
      <NotificationSettings />
      {/* Composer */}
      <div className="rounded-[12px] border border-border bg-surface p-3 space-y-2.5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('productivity.reminders.placeholder')}
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <label className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-[8px] border border-border bg-surface-soft text-sm text-text-secondary">
            <Clock size={14} className="text-text-muted" />
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="bg-transparent outline-none text-text-primary text-sm"
            />
          </label>
          <div className="inline-flex p-0.5 rounded-[8px] bg-surface-soft">
            {REPEATS.map((r) => (
              <button
                key={r.id}
                onClick={() => setRepeat(r.id)}
                className={clsx(
                  'px-2.5 py-1 rounded-[6px] text-xs font-medium transition',
                  repeat === r.id ? 'bg-surface text-text-primary shadow-[var(--ua-shadow-card)]' : 'text-text-muted',
                )}
              >
                {t(r.key)}
              </button>
            ))}
          </div>
          <LinkPicker value={link} onChange={setLink} className="ml-1" />
          <button
            onClick={submit}
            className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition"
          >
            <Plus size={15} />
            {t('productivity.reminders.add')}
          </button>
        </div>
      </div>

      {/* List */}
      {reminders.length === 0 ? (
        <EmptyState
          icon={BellRing}
          title={t('productivity.reminders.emptyTitle')}
          description={t('productivity.reminders.emptyDesc')}
        />
      ) : (
        <ul className="space-y-1.5">
          {reminders.map((r) => {
            const past = r.fired || r.at < Date.now();
            return (
              <li
                key={r.id}
                className={clsx(
                  'group flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3 py-2.5',
                  past && r.repeat === 'NONE' && 'opacity-60',
                )}
              >
                <span className="shrink-0 w-8 h-8 rounded-[8px] bg-primary-50 flex items-center justify-center text-primary-500">
                  <Bell size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{r.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-text-muted">{fmt(r.at)}</span>
                    {r.repeat && r.repeat !== 'NONE' && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-primary-500">
                        <Repeat size={10} />
                        {t(REPEATS.find((x) => x.id === r.repeat)!.key)}
                      </span>
                    )}
                    {r.link && <LinkBadge link={r.link} />}
                  </div>
                </div>
                <button
                  onClick={() => remove(r.id)}
                  className="shrink-0 p-1 rounded text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                  aria-label={t('productivity.reminders.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
