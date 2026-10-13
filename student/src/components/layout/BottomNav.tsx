import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, BookOpen, Workflow, User, type LucideIcon } from 'lucide-react';
import clsx from 'clsx';

/* =============================================================================
   BottomNav — fixed bottom navigation shown only on mobile (<lg).

   Reuses the app's EXISTING routes (no new routes are introduced):
     • Home     → /dashboard
     • Learn    → /explore
     • Projects → /contests   (coding challenges / projects surface)
     • Profile  → /profile

   The active destination is highlighted via NavLink's isActive. Safe-area insets
   are respected through `env(safe-area-inset-bottom)` padding so the bar clears
   the home indicator on notched devices. Pages add matching bottom padding to
   their scroll content so the last item stays reachable above this bar.
   ============================================================================= */

interface NavItem {
  to: string;
  icon: LucideIcon;
  labelKey: string;
}

const ITEMS: NavItem[] = [
  { to: '/dashboard', icon: Home,     labelKey: 'bottomNav.home' },
  { to: '/explore',   icon: BookOpen, labelKey: 'bottomNav.learn' },
  { to: '/contests',  icon: Workflow, labelKey: 'bottomNav.projects' },
  { to: '/profile',   icon: User,     labelKey: 'bottomNav.profile' },
];

export const BottomNav: React.FC = () => {
  const { t } = useTranslation();

  return (
    <nav
      aria-label="Primary"
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-surface border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="flex items-stretch justify-around">
        {ITEMS.map(({ to, icon: Icon, labelKey }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors',
                  isActive
                    ? 'text-primary-500'
                    : 'text-text-muted hover:text-text-secondary',
                )
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate">{t(labelKey)}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
};
