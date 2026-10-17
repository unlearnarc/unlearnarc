import React from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Trophy, Shield, Flame } from 'lucide-react';
// import { Heart } from 'lucide-react'; // Restore with mascot settings.
import { useAuth } from '../context/AuthContext';
import { RegionEditor } from '../components/profile/RegionEditor';
import { StreakCalendar } from '../components/profile/StreakCalendar';
// Mascot settings temporarily paused; keep the implementation for restoration.
// import { BuddySettings, useMascot } from '../components/mascot';
// import { getCharacter } from '../components/mascot/characters';
import { regionLabel } from '../utils/region';
import { ProfileAvatar } from '../components/ui/ProfileAvatar';
import './profile.css';

export const ProfilePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  // const { characterId } = useMascot(); // Restore with mascot settings.
  if (!user) return null;

  const number = (value?: number) => value == null ? '—' : value.toLocaleString(i18n.language);
  const days = (value?: number) => value == null ? '—' : t('profile.compact.days', { count: value, defaultValue: '{{count}} days' });
  const stats = [
    { icon: Trophy, label: t('profile.points'), value: number(user.points) },
    { icon: Flame, label: t('profile.compact.currentStreak', 'Current streak'), value: days(user.currentStreak) },
    { icon: Flame, label: t('profile.compact.bestStreak', 'Best streak'), value: days(user.longestStreak) },
  ];
  const joined = user.createdAt ? new Date(user.createdAt) : null;

  return (
    <div className="profile-page animate-fade-in">
      <header className="profile-heading">
        <h1>{t('nav.profile')}</h1>
        <p>{t('profile.compact.description', 'Manage your account, track your progress, and customize your learning experience.')}</p>
      </header>

      <section className="card profile-summary" aria-label={t('profile.compact.summary', 'Profile summary')}>
        <div className="profile-identity">
          <ProfileAvatar src={user.profilePicture} name={user.name} iconSize={28} className="profile-avatar" />
          <div className="profile-identity-copy">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <div className="profile-badges">
              <span><Globe size={12} aria-hidden="true" />{regionLabel(user.region)}</span>
              {user.authProvider && <span><Shield size={12} aria-hidden="true" />{user.authProvider}</span>}
            </div>
            {joined && !Number.isNaN(joined.getTime()) && <small>{t('profile.compact.memberSince', { defaultValue: 'Member since {{date}}', date: joined.toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' }) })}</small>}
          </div>
        </div>
        <dl className="profile-stats">
          {stats.map(({ icon: Icon, label, value }) => <div className="profile-stat" key={label}>
            <Icon size={17} aria-hidden="true" /><dd>{value}</dd><dt>{label}</dt>
          </div>)}
        </dl>
      </section>

      <div className="profile-grid">
        <StreakCalendar />
        {/* Mascot settings temporarily paused.
        <section className="card profile-buddy" aria-labelledby="profile-buddy-title">
          <header className="profile-card-heading">
            <Heart size={17} aria-hidden="true" /><h2 id="profile-buddy-title">{t('profile.studyBuddy')}</h2>
            <span className="badge-primary">{getCharacter(characterId).name}</span>
          </header>
          <BuddySettings />
        </section>
        */}
        <RegionEditor />
      </div>
    </div>
  );
};
