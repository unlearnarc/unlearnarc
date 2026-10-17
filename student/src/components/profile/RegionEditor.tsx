import React, { useState } from 'react';
import { Globe, MapPin, Check, Loader2, AlertCircle } from 'lucide-react';
import { userAuthAPI } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { REGION_OPTIONS, regionLabel, detectRegionFromBrowser } from '../../utils/region';

/** Existing self-service region workflow; cached identity updates after saving. */
export const RegionEditor: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [selected, setSelected] = useState<string>(user?.region ?? '');
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const dirty = selected !== '' && selected !== (user?.region ?? '');

  const save = async (region: string) => {
    if (!region) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await userAuthAPI.updateRegion(region);
      const updated = res.data?.data ?? res.data;
      updateUser({ region: updated?.region ?? region.toUpperCase() });
      setSelected(updated?.region ?? region.toUpperCase());
      setMessage({ type: 'ok', text: `Region set to ${regionLabel(region)}.` });
    } catch {
      setMessage({ type: 'err', text: 'Could not save region. Please try again.' });
    } finally { setSaving(false); }
  };

  const autoDetect = async () => {
    setDetecting(true);
    setMessage(null);
    const result = await detectRegionFromBrowser();
    setDetecting(false);
    if (result.ok) {
      setSelected(result.code);
      await save(result.code);
      return;
    }
    const reasonText: Record<typeof result.reason, string> = {
      unsupported: 'Your browser does not support location detection.',
      denied: 'Location permission denied. Pick your region manually instead.',
      unavailable: 'Could not determine your location. Pick it manually instead.',
      timeout: 'Location request timed out. Pick your region manually instead.',
    };
    setMessage({ type: 'err', text: reasonText[result.reason] });
  };

  return (
    <section className="card profile-region space-y-3" aria-labelledby="profile-region-title">
      <div className="flex items-center gap-2">
        <Globe size={16} className="text-primary-500" aria-hidden="true" />
        <h2 id="profile-region-title" className="text-sm font-semibold text-text-primary">Region</h2>
        {user?.region && <span className="badge-primary text-[10px] ml-auto">{regionLabel(user.region)}</span>}
      </div>
      <p className="text-xs text-text-muted">Your region is used for regional learning rankings.</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <select aria-label="Select your region" value={selected} onChange={e => setSelected(e.target.value)} disabled={saving || detecting} className="input flex-1 min-w-0">
          <option value="">Select your region…</option>
          {REGION_OPTIONS.map(r => <option key={r.code} value={r.code}>{r.label}</option>)}
          {selected && !REGION_OPTIONS.some(r => r.code === selected) && <option value={selected}>{regionLabel(selected)}</option>}
        </select>
        <button type="button" onClick={() => save(selected)} disabled={!dirty || saving || detecting} className="btn-primary inline-flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}Save
        </button>
      </div>
      <button type="button" onClick={autoDetect} disabled={saving || detecting} className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-[8px] text-sm font-medium border border-dashed border-border text-text-secondary hover:border-primary-500 hover:text-primary-500 transition disabled:opacity-50">
        {detecting ? <Loader2 size={15} className="animate-spin" /> : <MapPin size={15} />}
        {detecting ? 'Detecting your location…' : 'Detect automatically'}
      </button>
      {message && <div role="status" className={`flex items-start gap-2 text-xs rounded-[8px] px-3 py-2 ${message.type === 'ok' ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}>
        {message.type === 'ok' ? <Check size={14} className="mt-0.5 shrink-0" /> : <AlertCircle size={14} className="mt-0.5 shrink-0" />}<span>{message.text}</span>
      </div>}
    </section>
  );
};
