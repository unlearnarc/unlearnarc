import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { profileSharingAPI } from '../api/endpoints';
import { InitialsBadge, Spinner } from '../components/ui';
import './profile.css';

interface PublicProfile { name: string; points: number; rank: number; currentStreak: number; longestStreak: number }

export function PublicProfilePage() {
  const { token = '' } = useParams();
  const { t } = useTranslation();
  const profile = useQuery({
    queryKey: ['public-profile', token],
    queryFn: () => profileSharingAPI.publicProfile(token).then(r => r.data.data as PublicProfile),
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });
  const data = profile.data;
  return <main className="profile-page min-h-screen px-4 py-10" style={{ maxWidth: 720, alignContent: 'start' }}>
    <Link to="/" className="text-primary-500 font-bold">UnlearnArc</Link>
    {profile.isPending ? <div role="status" aria-label={t('common.loading', 'Loading')}><Spinner /></div> : profile.isError || !data ? <section className="card p-6 space-y-3" role="alert">
      <h1 className="text-xl font-bold">{t('profileSharing.unavailable', 'Profile unavailable')}</h1>
      <p>{t('profileSharing.unavailableHint', 'This link may have been disabled, or the profile could not be loaded.')}</p>
      <button className="btn-secondary" onClick={() => void profile.refetch()}>{t('common.retry', 'Retry')}</button>
    </section> : <section className="card p-6 space-y-6">
      <div className="flex items-center gap-4"><InitialsBadge name={data.name} size="lg" /><div><p className="text-xs text-text-secondary">{t('profileSharing.public', 'Public learning profile')}</p><h1 className="text-2xl font-bold break-words">{data.name}</h1></div></div>
      <dl className="grid grid-cols-2 gap-3">
        {[
          [t('profile.points', 'Points'), data.points],
          [t('profileSharing.rank', 'Global rank'), data.rank > 0 ? `#${data.rank}` : '—'],
          [t('profile.compact.currentStreak', 'Current streak'), t('profile.compact.days', { count: data.currentStreak, defaultValue: '{{count}} days' })],
          [t('profile.compact.bestStreak', 'Best streak'), t('profile.compact.days', { count: data.longestStreak, defaultValue: '{{count}} days' })],
        ].map(([label, value]) => <div className="profile-stat" key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
      </dl>
      <Link className="btn-primary inline-flex" to="/login">{t('profileSharing.join', 'Start your learning journey')}</Link>
    </section>}
  </main>;
}
