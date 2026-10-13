import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { ProgressBar } from '../components/ui/ProgressBar';
import { RegionEditor } from '../components/profile/RegionEditor';
import { StreakCalendar } from '../components/profile/StreakCalendar';
import { BuddySettings } from '../components/mascot';
import { TtsSettings } from '../components/profile/TtsSettings';
import { regionLabel } from '../utils/region';
import { User, Mail, Globe, Star, Trophy, Shield, ExternalLink, Flame, Heart } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const currentStreak = user.currentStreak ?? 0;
  const longestStreak = user.longestStreak ?? 0;

  const statItems = [
    { icon: Trophy, label: t('profile.points'),  value: user.points ?? 0,   color: 'text-achievement', bg: 'bg-achievement-soft' },
    { icon: Star,   label: t('profile.rank'),    value: user.rank   ?? '—', color: 'text-warning', bg: 'bg-warning-soft' },
    { icon: Flame,  label: t('profile.streak'),  value: `${currentStreak}d`, color: 'text-danger', bg: 'bg-danger-soft' },
    { icon: Flame,  label: t('profile.best'),    value: `${longestStreak}d`, color: 'text-primary-500', bg: 'bg-primary-50' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Profile hero */}
      <div className="card-lg overflow-hidden">
        <div className="h-28 bg-gradient-primary" />
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            {user.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user.name}
                className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-hover"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-primary-500 border-4 border-white shadow-hover flex items-center justify-center">
                <User size={32} className="text-white" />
              </div>
            )}
            <div className="mb-1">
              <h1 className="text-xl font-bold text-text-primary">{user.name}</h1>
              <p className="text-sm text-text-muted">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statItems.map(({ icon: Icon, label, value, color, bg }) => (
              <div key={label} className="bg-bg-soft rounded-[10px] p-4 flex items-center gap-3">
                <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>
                  <Icon size={17} className={color} />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">{value}</p>
                  <p className="text-xs text-text-muted">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily streak */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-danger-soft flex items-center justify-center shrink-0">
            <Flame size={24} className="text-danger" />
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-text-primary">{currentStreak}</span>
              <span className="text-sm text-text-muted">{t('profile.dayStreak', { count: currentStreak })}</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {currentStreak > 0
                ? t('profile.keepGoing', { count: longestStreak })
                : t('profile.startStreak')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary-500">{longestStreak}</p>
            <p className="text-[10px] text-text-muted uppercase tracking-wide">{t('profile.best')}</p>
          </div>
        </div>
      </div>


      {/* Activity calendar (marked days heat-map) */}
      <StreakCalendar />

      {/* Info */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-text-primary">{t('profile.accountDetails')}</h2>
        <div className="space-y-3">
          {[
            { icon: User,   label: t('profile.name'),   value: user.name },
            { icon: Mail,   label: t('profile.email'),  value: user.email },
            { icon: Globe,  label: t('profile.region'), value: regionLabel(user.region) },
            { icon: Shield, label: t('profile.auth'),   value: user.authProvider ?? 'Google' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center shrink-0">
                <Icon size={15} className="text-primary-500" />
              </div>
              <div>
                <p className="text-xs text-text-muted">{label}</p>
                <p className="text-sm font-medium text-text-primary">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Study Buddy — pick character + personality (also via right-click on the buddy) */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Heart size={16} className="text-primary-500" />
          <h2 className="text-sm font-semibold text-text-primary">{t('profile.studyBuddy')}</h2>
        </div>
        <p className="text-xs text-text-muted">
          {t('profile.studyBuddyDesc')}
        </p>
        <BuddySettings />
      </div>

      {/* Read aloud (text-to-speech) — accessibility toggle for dynamic content */}
      <TtsSettings />

      {/* Region self-service (manual select or browser geolocation) */}
      <RegionEditor />

      {/* Level progress stub */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">{t('profile.learningProgress')}</h2>
          <span className="badge-primary text-[10px]">{t('profile.level', { num: 1 })}</span>
        </div>
        <p className="text-xs text-text-muted mb-2">
          {t('profile.xpToNext', { current: user.points ?? 0, total: 500 })}
        </p>
        <ProgressBar value={((user.points ?? 0) / 500) * 100} height="h-2.5" />
      </div>

      {/* Danger zone */}
      <div className="card p-5 border-danger-soft">
        <h2 className="text-sm font-semibold text-text-primary mb-3">{t('profile.accountActions')}</h2>
        <div className="space-y-2">
          <a
            href="https://myaccount.google.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm text-text-secondary hover:bg-surface-soft transition"
          >
            <ExternalLink size={15} />
            {t('profile.manageGoogle')}
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-sm text-danger hover:bg-danger-soft transition"
          >
            <Shield size={15} />
            {t('profile.signOut')}
          </button>
        </div>
      </div>
    </div>
  );
};
