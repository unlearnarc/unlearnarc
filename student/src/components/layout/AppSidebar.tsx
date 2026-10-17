import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Logo } from '../ui/Logo';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import {
  BookOpen, LayoutDashboard, GraduationCap, Globe, LogOut,
  Workflow, MessageSquareText, PanelLeftClose, PanelLeftOpen, X, Trophy,
  Medal, Map, Clapperboard,
  Moon, Sun,
} from 'lucide-react';
import clsx from 'clsx';

/* =============================================================================
   AppSidebar — the primary navigation rail for the student app.
   - Collapsible on desktop (icon-only ⇄ expanded), persisted to localStorage.
   - Slide-in drawer on mobile with a dimmed backdrop.
   Rendered statically by AppLayout; every non-full-screen page sits beside it.
   ============================================================================= */

const NAV_LINKS = [
  { to: '/dashboard',             icon: LayoutDashboard,   labelKey: 'nav.dashboard'  },
  { to: '/explore',               icon: Globe,             labelKey: 'nav.explore'    },
  { to: '/my-courses',            icon: BookOpen,          labelKey: 'nav.myCourses'  },
  { to: '/tests',                 icon: GraduationCap,     labelKey: 'nav.tests'      },
  { to: '/contests',              icon: Trophy,            labelKey: 'nav.contests'   },
  { to: '/leaderboard',           icon: Medal,             labelKey: 'nav.leaderboard'},
  { to: '/roadmap',               icon: Map,               labelKey: 'nav.roadmap'    },
  { to: '/algorithms',            icon: Workflow,          labelKey: 'nav.algorithms' },
  { to: '/animations',            icon: Clapperboard,      labelKey: 'nav.animations' },
  { to: '/interview-experiences', icon: MessageSquareText, labelKey: 'nav.interviews' },
] as const;

interface AppSidebarProps {
  /** Expanded (true) vs icon-only collapsed (false) — desktop only. */
  collapsed: boolean;
  onToggleCollapse: () => void;
  /** Mobile drawer open state. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  collapsed, onToggleCollapse, mobileOpen, onCloseMobile,
}) => {
  const { user, isAuthenticated, loginWithGoogle, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    onCloseMobile();
    navigate('/');
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-navy-950/40 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen z-50 flex flex-col bg-surface border-r border-border',
          'transition-[width,transform] duration-300 ease-in-out',
          collapsed ? 'lg:w-[72px]' : 'lg:w-64',
          // mobile: fixed width drawer that slides in/out
          'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        {/* Logo + collapse/close controls */}
        <div className={clsx(
          'flex items-center h-16 border-b border-border shrink-0',
          collapsed ? 'lg:justify-center px-3' : 'px-4 justify-between',
        )}>
          <Logo to="/" onClick={onCloseMobile} showWordmark={!collapsed} />

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapse}
            className={clsx(
              'hidden lg:flex p-1.5 rounded-[8px] text-text-muted hover:bg-surface-soft hover:text-text-primary transition',
              collapsed && 'lg:hidden',
            )}
            title={t('sidebar.collapse')}
          >
            <PanelLeftClose size={18} className="ua-flip-rtl" />
          </button>

          {/* Mobile close */}
          <button
            onClick={onCloseMobile}
            aria-label="Close menu"
            className="lg:hidden p-1.5 rounded-[8px] text-text-muted hover:bg-surface-soft hover:text-text-primary transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Expand toggle when collapsed (desktop) */}
        {collapsed && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center mx-3 mt-3 p-2 rounded-[8px] text-text-muted hover:bg-surface-soft hover:text-text-primary transition"
            title={t('sidebar.expand')}
          >
            <PanelLeftOpen size={18} className="ua-flip-rtl" />
          </button>
        )}

        {/* Nav */}
        {isAuthenticated ? (
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {NAV_LINKS.map(({ to, icon: Icon, labelKey }) => {
              const label = t(labelKey);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onCloseMobile}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 rounded-[10px] text-sm font-medium transition',
                      collapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-primary-50 text-primary-500'
                        : 'text-text-secondary hover:bg-surface-soft hover:text-text-primary',
                    )
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1 px-3 py-4">
            <p className={clsx('text-sm text-text-muted px-2', collapsed && 'lg:hidden')}>
              {t('sidebar.signInPrompt')}
            </p>
          </div>
        )}

        {/* Theme toggle */}
        <div className="px-3 pb-1 shrink-0">
          <button
            onClick={toggleTheme}
            title={collapsed ? (theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')) : undefined}
            className={clsx(
              'w-full flex items-center gap-3 rounded-[10px] text-sm font-medium text-text-secondary hover:bg-surface-soft hover:text-text-primary transition',
              collapsed ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5',
            )}
          >
            {theme === 'dark'
              ? <Sun size={18} className="shrink-0" />
              : <Moon size={18} className="shrink-0" />}
            {!collapsed && (theme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode'))}
          </button>
        </div>

        {/* Footer: profile / auth */}
        <div className="px-3 py-3 border-t border-border shrink-0">
          {isAuthenticated ? (
            <div className="space-y-1">
              <NavLink
                to="/profile"
                onClick={onCloseMobile}
                title={collapsed ? (user?.name ?? t('sidebar.profile')) : undefined}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-[10px] text-sm transition',
                    collapsed ? 'lg:justify-center lg:px-0 px-3 py-2' : 'px-3 py-2',
                    isActive
                      ? 'bg-primary-50 text-primary-500'
                      : 'text-text-secondary hover:bg-surface-soft hover:text-text-primary',
                  )
                }
              >
                <ProfileAvatar src={user?.profilePicture} name={user?.name} iconSize={14}
                  className="w-7 h-7 rounded-full object-cover ring-2 ring-border shrink-0" />
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user?.name ?? t('sidebar.student')}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user?.email}</p>
                  </div>
                )}
              </NavLink>

              <button
                onClick={handleLogout}
                title={collapsed ? t('sidebar.signOut') : undefined}
                className={clsx(
                  'w-full flex items-center gap-3 rounded-[10px] text-sm text-danger hover:bg-danger-soft transition',
                  collapsed ? 'lg:justify-center lg:px-0 px-3 py-2' : 'px-3 py-2',
                )}
              >
                <LogOut size={16} className="shrink-0 ua-flip-rtl" />
                {!collapsed && t('sidebar.signOut')}
              </button>
            </div>
          ) : (
            <button
              onClick={loginWithGoogle}
              className={clsx('btn-primary w-full text-sm py-2', collapsed && 'lg:px-0')}
              title={collapsed ? t('sidebar.continueWithGoogle') : undefined}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="shrink-0">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {!collapsed && t('sidebar.continueWithGoogle')}
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
