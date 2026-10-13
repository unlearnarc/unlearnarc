import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Flame, CalendarDays } from 'lucide-react';
import { userAuthAPI } from '../../api/endpoints';
import type { StreakCalendar as StreakCalendarData } from '../../types';
import { Spinner } from '../ui/Spinner';

/* =============================================================================
   StreakCalendar — GitHub-style contribution heat-map of the user's active days.
   Renders the trailing ~26 weeks (6 months) ending today, one cell per day,
   marking days the user "showed up" (completed a test or contest submission).
   Zero extra dependencies — pure date math + a CSS grid.
   ============================================================================= */

const unwrap = <T,>(res: any): T => res?.data?.data ?? res?.data;

/** yyyy-MM-dd in LOCAL time (matches the server's LocalDate, avoids UTC shift). */
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const WEEKS = 26;                 // ~6 months
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY = ['', 'M', '', 'W', '', 'F', ''];   // sparse labels (Mon/Wed/Fri)
const MONTH = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export const StreakCalendar: React.FC = () => {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  // Window start: Sunday of the week containing (today - (WEEKS-1) weeks).
  const start = useMemo(() => {
    const s = new Date(today.getTime() - (WEEKS - 1) * 7 * DAY_MS);
    s.setDate(s.getDate() - s.getDay()); // back up to Sunday
    s.setHours(0, 0, 0, 0);
    return s;
  }, [today]);

  const q = useQuery({
    queryKey: ['streak-calendar', iso(start), iso(today)],
    queryFn: () =>
      userAuthAPI.streakCalendar(iso(start), iso(today)).then(unwrap<StreakCalendarData>),
  });

  const activeSet = useMemo(
    () => new Set(q.data?.activeDays ?? []),
    [q.data],
  );

  // Build a WEEKS × 7 grid of Date objects (columns = weeks, rows = weekdays).
  const weeks = useMemo(() => {
    const cols: Date[][] = [];
    for (let w = 0; w < WEEKS; w++) {
      const col: Date[] = [];
      for (let d = 0; d < 7; d++) {
        col.push(new Date(start.getTime() + (w * 7 + d) * DAY_MS));
      }
      cols.push(col);
    }
    return cols;
  }, [start]);

  // Month labels above the columns (show when the month changes between weeks).
  const monthLabels = useMemo(
    () =>
      weeks.map((col, i) => {
        const first = col[0];
        const prev = i > 0 ? weeks[i - 1][0] : null;
        return !prev || prev.getMonth() !== first.getMonth() ? MONTH[first.getMonth()] : '';
      }),
    [weeks],
  );

  const totalActive = q.data?.activeDayCount ?? activeSet.size;

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CalendarDays size={16} className="text-primary-500" />
        <h2 className="text-sm font-semibold text-text-primary">Activity Calendar</h2>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-text-muted">
          <Flame size={12} className="text-danger" />
          {totalActive} active day{totalActive === 1 ? '' : 's'}
        </span>
      </div>

      {q.isLoading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : q.isError ? (
        <p className="text-xs text-text-muted py-4">Could not load activity. Try again later.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            {/* Month labels */}
            <div className="flex gap-[3px] pl-6 mb-1">
              {monthLabels.map((m, i) => (
                <div key={i} className="w-[12px] text-[9px] text-text-muted text-left">
                  {m}
                </div>
              ))}
            </div>

            <div className="flex">
              {/* Weekday labels */}
              <div className="flex flex-col gap-[3px] pr-1">
                {WEEKDAY.map((w, i) => (
                  <div key={i} className="h-[12px] w-4 text-[9px] text-text-muted leading-[12px]">
                    {w}
                  </div>
                ))}
              </div>

              {/* Week columns */}
              <div className="flex gap-[3px]">
                {weeks.map((col, wi) => (
                  <div key={wi} className="flex flex-col gap-[3px]">
                    {col.map((day) => {
                      const future = day.getTime() > today.getTime();
                      const active = activeSet.has(iso(day));
                      const isToday = day.getTime() === today.getTime();
                      return (
                        <div
                          key={day.getTime()}
                          title={future ? '' : `${iso(day)}${active ? ' • active' : ''}`}
                          className={[
                            'w-[12px] h-[12px] rounded-[3px]',
                            future
                              ? 'bg-transparent'
                              : active
                                ? 'bg-primary-500'
                                : 'bg-surface-soft border border-border',
                            isToday ? 'ring-1 ring-primary-500 ring-offset-1' : '',
                          ].join(' ')}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-text-muted">
              <span>Less</span>
              <div className="w-[12px] h-[12px] rounded-[3px] bg-surface-soft border border-border" />
              <div className="w-[12px] h-[12px] rounded-[3px] bg-primary-500/50" />
              <div className="w-[12px] h-[12px] rounded-[3px] bg-primary-500" />
              <span>More</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
