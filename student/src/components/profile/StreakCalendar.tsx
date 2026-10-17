import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { userAuthAPI } from '../../api/endpoints';
import type { StreakCalendar as StreakCalendarData } from '../../types';
import { Spinner } from '../ui/Spinner';

/** Local dates match the server's LocalDate; calendar arithmetic avoids DST shifts. */
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const WEEKS = 26;

export const StreakCalendar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const today = useMemo(() => { const date = new Date(); date.setHours(0, 0, 0, 0); return date; }, []);
  const start = useMemo(() => {
    const date = new Date(today);
    date.setDate(date.getDate() - (WEEKS - 1) * 7 - date.getDay());
    return date;
  }, [today]);
  const query = useQuery({
    queryKey: ['streak-calendar', iso(start), iso(today)],
    queryFn: async () => {
      const res = await userAuthAPI.streakCalendar(iso(start), iso(today));
      return (res.data?.data ?? res.data) as StreakCalendarData;
    },
  });
  const activeSet = useMemo(() => new Set((query.data?.activeDays ?? []).filter(day => day >= iso(start) && day <= iso(today))), [query.data, start, today]);
  const weeks = useMemo(() => Array.from({ length: WEEKS }, (_, week) => Array.from({ length: 7 }, (_, day) => {
    const date = new Date(start);
    date.setDate(date.getDate() + week * 7 + day);
    return date;
  })), [start]);
  const monthLabels = weeks.map((week, index) => index === 0 || week[0].getMonth() !== weeks[index - 1][0].getMonth() ? week[0].toLocaleDateString(i18n.language, { month: 'short' }) : '');
  const title = t('profile.compact.activity', 'Activity Calendar');

  return <section className="card profile-calendar" aria-labelledby="profile-calendar-title">
    <header className="profile-card-heading">
      <CalendarDays size={17} aria-hidden="true" /><h2 id="profile-calendar-title">{title}</h2>
      {query.isSuccess && <span className="text-text-secondary">{t('profile.compact.activeDays', { defaultValue: '{{count}} active days', count: activeSet.size })}</span>}
    </header>
    {query.isLoading ? <div role="status" className="flex justify-center py-8"><Spinner /><span className="sr-only">{t('common.loading')}</span></div> : query.isError ? <p role="status" className="text-xs text-text-secondary">{t('profile.compact.activityError', 'Could not load activity.')} <button type="button" className="text-primary-500 underline" onClick={() => void query.refetch()}>{t('common.retry', 'Retry')}</button></p> : <>
      <div className="profile-calendar-scroll" tabIndex={0} role="region" aria-label={title}>
        <div className="profile-calendar-content">
          <div className="flex gap-[3px] pl-6 mb-1" aria-hidden="true">{monthLabels.map((month, i) => <div key={i} className="w-[12px] shrink-0 text-[9px] text-text-muted">{month}</div>)}</div>
          <div className="flex">
            <div className="flex flex-col gap-[3px] pr-1" aria-hidden="true">{Array.from({ length: 7 }, (_, day) => <div key={day} className="h-[12px] w-4 text-[9px] text-text-muted leading-[12px]">{[1, 3, 5].includes(day) ? new Date(2024, 0, 7 + day).toLocaleDateString(i18n.language, { weekday: 'narrow' }) : ''}</div>)}</div>
            <div className="flex gap-[3px]">{weeks.map((week, i) => <div key={i} className="flex flex-col gap-[3px]">{week.map(day => {
              const future = day > today;
              const active = activeSet.has(iso(day));
              const label = `${iso(day)} • ${active ? t('profile.compact.active', 'Active') : t('profile.compact.noActivity', 'No activity')}`;
              return <div key={iso(day)} title={future ? undefined : label} role={future ? undefined : 'img'} aria-label={future ? undefined : label} aria-hidden={future || undefined} className={`w-[12px] h-[12px] rounded-[3px] ${future ? 'bg-transparent' : active ? 'bg-primary-500' : 'bg-surface-soft border border-border'} ${iso(day) === iso(today) ? 'ring-1 ring-primary-500 ring-offset-1' : ''}`} />;
            })}</div>)}</div>
          </div>
        </div>
      </div>
      {/* The API tracks presence, not event counts. Do not imply invented intensity. */}
      <div className="profile-calendar-legend"><span className="w-3 h-3 rounded-[3px] bg-surface-soft border border-border" />{t('profile.compact.noActivity', 'No activity')}<span className="w-3 h-3 rounded-[3px] bg-primary-500" />{t('profile.compact.active', 'Active')}</div>
    </>}
  </section>;
};
