import React, { useState, useEffect } from 'react';
import { Link, Outlet, useOutletContext } from 'react-router-dom';
import { Menu, Search } from 'lucide-react';
import { ProfileAvatar } from '../ui/ProfileAvatar';
import clsx from 'clsx';
import { AppSidebar } from './AppSidebar';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { Logo } from '../ui/Logo';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { GlobalSearchDialog } from '../search/GlobalSearchDialog';
import { useAuth } from '../../context/AuthContext';
import { ProductivityProvider } from '../productivity';
import { FeatureTour } from '../onboarding/FeatureTour';

/* =============================================================================
   AppLayout — the single shared shell for the student app.

   • Renders a STATIC AppSidebar on the left and the routed page on the right.
   • Sidebar is collapsible (desktop) and a slide-in drawer (mobile).
   • The collapsed state is persisted to localStorage.
   • Pages that want the full screen (e.g. an active quiz) call
     `useFullScreen(true)` via the outlet context — the layout then hides the
     sidebar / topbar chrome and removes content padding so the page owns the
     whole viewport. See `useFullScreen` below.
   ============================================================================= */

const COLLAPSE_KEY = 'ua_sidebar_collapsed';

interface LayoutContext {
  /** Pages call this to request/relinquish a chrome-less full-screen view. */
  setFullScreen: (value: boolean) => void;
}

export const AppLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(COLLAPSE_KEY) === '1',
  );
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fullScreen, setFullScreen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  // Full-screen pages reset on unmount via the context setter they call.
  const ctx: LayoutContext = { setFullScreen };

  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {!fullScreen && (
        <AppSidebar
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(v => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />
      )}

      {/* Content column — offset by the sidebar width on desktop */}
      <div
        className={clsx(
          'min-h-screen transition-[margin] duration-300 ease-in-out',
          fullScreen ? 'ml-0' : collapsed ? 'lg:ml-[72px]' : 'lg:ml-64',
        )}
      >
        {/* Desktop global search bar */}
        {!fullScreen && <TopBar />}

        {/* Compact mobile header: logo (left) · search · avatar (right).
            The hamburger stays as the drawer trigger behind the logo tap row. */}
        {!fullScreen && (
          <header className="lg:hidden sticky top-0 z-30 flex items-center gap-2 h-14 px-3 bg-surface border-b border-border">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-1 rounded-[8px] text-text-secondary hover:bg-surface-soft transition"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <div className="flex-1 min-w-0">
              <Logo to="/" size="sm" />
            </div>
            <button
              onClick={() => setMobileSearchOpen(true)}
              className="p-2 rounded-[8px] text-text-secondary hover:bg-surface-soft transition"
              aria-label="Search"
            >
              <Search size={20} />
            </button>
            <LanguageSwitcher compact />
            {/* User profile / avatar */}
            <Link
              to={isAuthenticated ? '/profile' : '/login'}
              className="shrink-0 rounded-full"
              aria-label="Profile"
            >
              <ProfileAvatar src={user?.profilePicture} name={user?.name}
                className="w-8 h-8 rounded-full object-cover ring-2 ring-border" />
            </Link>
          </header>
        )}

        {/* Shared global search dialog for mobile (desktop uses TopBar's) */}
        <GlobalSearchDialog open={mobileSearchOpen} onClose={() => setMobileSearchOpen(false)} />

        <main
          className={clsx(
            fullScreen
              ? ''
              // Extra bottom padding so content clears the fixed productivity
              // dock (mobile: above BottomNav; desktop: ≈2.25rem slim bar).
              : 'max-w-7xl mx-auto px-4 sm:px-6 py-6 lg:py-8 pb-[calc(7.75rem+env(safe-area-inset-bottom))] lg:pb-14',
          )}
        >
          <Outlet context={ctx} />
        </main>
      </div>

      {/* Fixed bottom navigation — mobile only, hidden in full-screen pages */}
      {!fullScreen && <BottomNav />}

      {/* Floating learning-utilities dock + reminder scheduler. Hidden on
          full-screen pages so an active quiz / contest owns the viewport. */}
      {!fullScreen && <ProductivityProvider />}
      {!fullScreen && isAuthenticated && user?.id && <FeatureTour key={user.id} />}
    </div>
  );
};

/* -----------------------------------------------------------------------------
   useFullScreen — page-level hook. Call inside any routed page to toggle the
   chrome-less full-screen layout. Automatically relinquishes on unmount.
     const fullScreen = useFullScreen();  // enables by default
     fullScreen(false);                   // or control conditionally
   --------------------------------------------------------------------------- */
export function useFullScreen(enabled = true) {
  const { setFullScreen } = useOutletContext<LayoutContext>();
  useEffect(() => {
    setFullScreen(enabled);
    return () => setFullScreen(false);
  }, [enabled, setFullScreen]);
}
