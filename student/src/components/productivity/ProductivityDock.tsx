import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Timer, StickyNote, ListTodo, BellRing, Brain } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import clsx from 'clsx';
import { ToolShell } from './ToolShell';
import { PomodoroPanel } from './PomodoroPanel';
import { NotesPanel } from './NotesPanel';
import { TodoPanel } from './TodoPanel';
import { RemindersPanel } from './RemindersPanel';
import { FocusPanel } from './FocusPanel';
import { useTodos, useReminders, usePomodoroStats } from './hooks';
import { usePomodoro } from './usePomodoro';
import type { ToolId } from './types';

/* =============================================================================
   ProductivityDock — the always-available utility bar.

   A slim, full-width bar pinned flush to the very bottom edge of the viewport
   (mirroring the slim TopBar at the top). It has no outer padding/margin and
   spans edge-to-edge. All tool icons are grouped on the RIGHT-hand side.

   Each icon is a learning utility; tapping one opens that tool in a full-screen
   ToolShell. Live badges surface state at a glance (running pomodoro time, open
   todo count, upcoming reminders) so the bar stays useful while collapsed.

   The whole bar hides automatically on full-screen pages because it's rendered
   inside AppLayout's chrome region. On mobile it sits above the BottomNav.
   ============================================================================= */

interface Tool {
  id: ToolId;
  icon: LucideIcon;
  labelKey: string;
}

const TOOLS: Tool[] = [
  { id: 'pomodoro', icon: Timer, labelKey: 'productivity.tools.pomodoro' },
  { id: 'notes', icon: StickyNote, labelKey: 'productivity.tools.notes' },
  { id: 'todos', icon: ListTodo, labelKey: 'productivity.tools.todos' },
  { id: 'reminders', icon: BellRing, labelKey: 'productivity.tools.reminders' },
  { id: 'focus', icon: Brain, labelKey: 'productivity.tools.focus' },
];

export const ProductivityDock: React.FC = () => {
  const { t } = useTranslation();
  const [active, setActive] = useState<ToolId | null>(null);

  const { openCount } = useTodos();
  const { upcomingCount } = useReminders();
  const { todayCount } = usePomodoroStats();
  const pomo = usePomodoro();

  const badgeFor = (id: ToolId): string | null => {
    if (id === 'pomodoro' && pomo.running) {
      const m = Math.floor(pomo.remaining / 60);
      const s = pomo.remaining % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }
    if (id === 'pomodoro' && todayCount > 0) return String(todayCount);
    if (id === 'todos' && openCount > 0) return String(openCount);
    if (id === 'reminders' && upcomingCount > 0) return String(upcomingCount);
    return null;
  };

  const activeTool = TOOLS.find((x) => x.id === active) ?? null;

  return (
    <>
      {/* Slim full-width bar flush to the very bottom. Mirrors TopBar styling.
          On mobile it sits ABOVE the BottomNav (which is ≈3.25rem tall + safe
          area); on desktop the BottomNav is hidden so the dock sits flush. */}
      <div
        className={clsx(
          'fixed inset-x-0 z-40 bg-surface border-t border-border',
          // Mobile: sit above the BottomNav (its safe-area padding is enough).
          // Desktop: BottomNav hidden, so pin flush to bottom + pad safe-area.
          'bottom-[calc(3.25rem+env(safe-area-inset-bottom))] lg:bottom-0',
          'lg:pb-[env(safe-area-inset-bottom)]',
        )}
      >
        <nav
          aria-label={t('productivity.dock.label')}
          className="flex items-center justify-end gap-0.5 h-9 pr-2 sm:pr-3"
        >
          {TOOLS.map(({ id, icon: Icon, labelKey }) => {
            const badge = badgeFor(id);
            const isRunning = id === 'pomodoro' && pomo.running;
            return (
              <button
                key={id}
                onClick={() => setActive(id)}
                title={t(labelKey)}
                aria-label={t(labelKey)}
                className={clsx(
                  'relative group flex items-center justify-center w-8 h-8 rounded-[8px] transition-colors',
                  'text-text-secondary hover:bg-surface-soft hover:text-primary-500',
                  isRunning && 'text-primary-500',
                )}
              >
                <Icon size={17} />
                {badge && (
                  <span
                    className={clsx(
                      'absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-1 rounded-full text-[9px] font-bold flex items-center justify-center bg-primary-500 text-white',
                      isRunning && 'tabular-nums',
                    )}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Full-screen tool overlay */}
      {activeTool && (
        <ToolShell
          open={active !== null}
          onClose={() => setActive(null)}
          title={t(activeTool.labelKey)}
          icon={activeTool.icon}
        >
          {active === 'pomodoro' && <PomodoroPanel />}
          {active === 'notes' && <NotesPanel />}
          {active === 'todos' && <TodoPanel />}
          {active === 'reminders' && <RemindersPanel />}
          {active === 'focus' && <FocusPanel />}
        </ToolShell>
      )}
    </>
  );
};
