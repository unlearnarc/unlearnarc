import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { profileSharingAPI } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';

export function ProfileSharing() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const settings = useQuery({
    queryKey: ['profile-sharing', user?.id],
    queryFn: () => profileSharingAPI.settings().then(r => r.data.data as { token: string | null }),
  });
  const token = settings.data?.token;
  const url = token ? `${window.location.origin}/p/${encodeURIComponent(token)}` : '';

  async function toggle() {
    setBusy(true);
    try {
      await profileSharingAPI.update(!token);
      await settings.refetch({ throwOnError: true });
    } catch { toast.error(t('profileSharing.saveError', 'Could not update sharing. Please try again.')); }
    finally { setBusy(false); }
  }

  async function share() {
    try {
      if (navigator.share) await navigator.share({ title: 'UnlearnArc', text: t('profileSharing.invite', 'See my learning progress on UnlearnArc'), url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(t('profileSharing.copied', 'Profile link copied'));
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === 'AbortError')) toast.error(t('profileSharing.copyError', 'Could not share. Copy the link below instead.'));
    }
  }

  return <section className="card space-y-3" aria-labelledby="profile-sharing-title">
    <header className="profile-card-heading"><Share2 size={17} /><h2 id="profile-sharing-title">{t('profileSharing.title', 'Share your profile')}</h2></header>
    <p className="text-sm text-text-secondary">{t('profileSharing.privacy', 'Share your name, points, global rank and streaks. Your email, region and account details stay private. Anyone with the link can view it.')}</p>
    {settings.isError ? <div role="alert" className="text-sm"><p>{t('profileSharing.loadError', 'Could not load sharing settings.')}</p><button className="btn-secondary mt-2" onClick={() => void settings.refetch()}>{t('common.retry', 'Retry')}</button></div> : <button type="button" className="btn-secondary" role="switch" aria-checked={!!token} disabled={settings.isPending || busy} onClick={() => void toggle()}>
      {token ? t('profileSharing.disable', 'Disable profile sharing') : t('profileSharing.enable', 'Enable profile sharing')}
    </button>}
    {url && <div className="space-y-2">
      <label className="block text-xs text-text-secondary" htmlFor="profile-share-link">{t('profileSharing.link', 'Public profile link')}</label>
      <input id="profile-share-link" className="w-full rounded-lg border border-border bg-surface p-2 text-sm" value={url} readOnly onFocus={e => e.target.select()} />
      <div className="flex flex-wrap gap-2"><button className="btn-primary" disabled={busy} onClick={() => void share()}>{t('profileSharing.share', 'Share profile')}</button><a className="btn-secondary" href={url} target="_blank" rel="noopener noreferrer">{t('profileSharing.preview', 'Preview')}</a></div>
      <p className="text-xs text-text-secondary">{t('profileSharing.revokeHint', 'Disabling sharing immediately invalidates this link. Enabling it again creates a new one.')}</p>
    </div>}
  </section>;
}
