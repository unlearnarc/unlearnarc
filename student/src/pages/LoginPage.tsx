import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/ui/Logo';
import { Zap, Shield, Target, Sun, Moon } from 'lucide-react';

const BULLETS = [
  { icon: Zap,    text: 'Domain-level adaptive tests'        },
  { icon: Target, text: 'Course & topic-level quizzes'       },
  { icon: Shield, text: 'Secure Google sign-in, no password' },
];

export const LoginPage: React.FC = () => {
  const { isAuthenticated, loginWithGoogle } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [params] = useSearchParams();
  const error    = params.get('error');

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — brand */}
      <div className="hidden lg:flex flex-col justify-between w-[52%] bg-gradient-hero p-12">
        <Logo size="lg" />

        <div>
          <h1 className="text-4xl font-bold text-text-primary leading-tight mb-4">
            Master new skills.<br />
            <span className="text-primary-500">One domain at a time.</span>
          </h1>
          <p className="text-text-secondary text-base leading-relaxed mb-8 max-w-sm">
            Structured courses, smart adaptive tests, and real progress tracking —
            all in one polished platform.
          </p>
          <div className="space-y-3">
            {BULLETS.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                  <Icon size={15} className="text-primary-500" />
                </div>
                <span className="text-text-secondary text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-text-secondary text-xs">© 2025 UnlearnArc. All rights reserved.</p>
      </div>

      {/* Right panel — sign in */}
      <div className="relative flex-1 flex items-center justify-center px-6 py-24">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          className="absolute top-6 right-6 flex items-center gap-2 rounded-[10px] border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface-soft transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
        >
          {theme === 'light' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          {theme === 'light' ? 'Dark mode' : 'Light mode'}
        </button>
        <div className="w-full max-w-sm animate-slide-up">
          {/* Logo mobile */}
          <div className="mb-10 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-bold text-text-primary mb-1.5">Welcome back</h2>
          <p className="text-sm text-text-secondary mb-8">
            Sign in to continue your learning journey.
          </p>

          {/* Error from OAuth */}
          {error && (
            <div className="bg-danger-soft border border-danger/20 rounded-[10px] px-4 py-3 mb-6">
              <p className="text-sm text-danger">{decodeURIComponent(error)}</p>
            </div>
          )}

          <button
            onClick={loginWithGoogle}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-surface border border-border rounded-[10px] text-sm font-semibold text-text-primary hover:bg-surface-soft hover:border-border-strong hover:shadow-hover transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="text-xs text-text-muted text-center mt-6 leading-relaxed">
            By signing in, you agree to our{' '}
            <span className="text-primary-500 cursor-pointer hover:underline">Terms</span> and{' '}
            <span className="text-primary-500 cursor-pointer hover:underline">Privacy Policy</span>.
          </p>

          <div className="mt-8 flex items-start gap-2.5 p-3.5 bg-primary-50 rounded-[10px]">
            <Shield size={16} className="text-primary-500 shrink-0 mt-0.5" />
            <p className="text-xs text-text-secondary leading-relaxed">
              We never store your password. Authentication is handled securely by Google.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
