import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { userAuthAPI } from '../api/endpoints';
import type { UserProfile } from '../types';
import { disablePush } from '../pwa/notifications';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => void;
  logout: () => void;
  setTokenFromCallback: (token: string, refreshToken: string, userData: Partial<UserProfile>) => void;
  /** Merge updated fields into the cached user (e.g. after a region change). */
  updateUser: (patch: Partial<UserProfile>) => void;
  /** Re-fetch /me + streak from the server and update the cache. */
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken]   = useState<string | null>(() => localStorage.getItem('ua_user_token'));
  const [user, setUser]     = useState<UserProfile | null>(() => {
    const stored = localStorage.getItem('ua_user');
    return stored ? JSON.parse(stored) : null;
  });
  // Resolve an existing session before mounting protected pages. Otherwise
  // the profile refresh unmounts them after their startup requests have fired.
  const [isLoading, setIsLoading] = useState(() => !!token);

  const persist = useCallback((next: UserProfile | null) => {
    if (next) localStorage.setItem('ua_user', JSON.stringify(next));
    else localStorage.removeItem('ua_user');
  }, []);

  /**
   * Pull the authoritative profile from the server and fold in today's streak.
   *
   * IMPORTANT: the OAuth callback seeds the cache with only id/name/email/picture
   * (no points/rank/streak). We therefore ALWAYS refresh /me when a token is
   * present — not just when `user` is null — otherwise the profile would show a
   * blank rank/points/streak even though the leaderboard (which reads /me fresh)
   * shows them correctly.
   */
  const loadProfile = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await userAuthAPI.me();
      const profile: UserProfile = res.data?.data ?? res.data;

      // Register today's visit; merge the fresh streak into the profile.
      // Best-effort: a failed ping must never break auth/session.
      let merged: UserProfile = profile;
      try {
        const sr = await userAuthAPI.pingStreak();
        const streak = sr.data?.data ?? sr.data;
        if (streak) {
          merged = {
            ...profile,
            currentStreak:    streak.currentStreak,
            longestStreak:    streak.longestStreak,
            lastActivityDate: streak.lastActivityDate,
          };
        }
      } catch { /* streak ping is best-effort */ }

      setUser(merged);
      persist(merged);
    } catch (err: any) {
      // Only drop the session on a genuine auth failure (401). A 403 (role) or
      // transient/network error must NOT wipe a valid token, otherwise a single
      // failed /me call logs the user out on every load.
      if (err?.response?.status === 401) {
        setToken(null);
        setUser(null);
        localStorage.removeItem('ua_user_token');
        persist(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [persist]);

  // Refresh the profile whenever we hold a token (covers reload with a stale cache).
  useEffect(() => {
    if (token) void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loginWithGoogle = useCallback(() => {
    // Redirect to the backend Spring Security OAuth2 initiation endpoint.
    // Spring forwards the browser to Google with the registered redirect_uri
    // (<backend>/oauth2/callback/google) and, on success, redirects back to
    // OAUTH2_REDIRECT_URI (http://localhost:3002/auth/callback).
    //
    // Local dev: VITE_API_URL is empty, so we hit the RELATIVE "/oauth2/..."
    // path which Vite proxies to the backend — keeping the whole flow on the
    // localhost:3002 origin so the JWT lands on the same origin the app reads.
    // Cloud: VITE_API_URL points at the Render backend origin directly.
    const apiOrigin = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');
    window.location.href = `${apiOrigin}/oauth2/authorization/google`;
  }, []);

  const setTokenFromCallback = useCallback((
    accessToken: string,
    _refreshToken: string,
    userData: Partial<UserProfile>
  ) => {
    setToken(accessToken);
    localStorage.setItem('ua_user_token', accessToken);
    if (_refreshToken) localStorage.setItem('ua_user_refresh', _refreshToken);
    if (userData) {
      const profile = userData as UserProfile;
      setUser(profile);
      persist(profile);
    }
    // The token change triggers loadProfile() via the effect above, which fills
    // in points/rank/streak the callback params don't carry.
  }, [persist]);

  const updateUser = useCallback((patch: Partial<UserProfile>) => {
    setUser((prev) => {
      const next = { ...(prev ?? {}), ...patch } as UserProfile;
      persist(next);
      return next;
    });
  }, [persist]);

  const refreshUser = useCallback(() => loadProfile(), [loadProfile]);

  const logout = useCallback(() => {
    void disablePush().catch(() => {});
    setToken(null);
    setUser(null);
    localStorage.removeItem('ua_user_token');
    localStorage.removeItem('ua_user_refresh');
    localStorage.removeItem('ua_user');
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        loginWithGoogle,
        logout,
        setTokenFromCallback,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
