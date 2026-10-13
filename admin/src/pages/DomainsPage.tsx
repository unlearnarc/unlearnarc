import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Globe, X, Search, Link2, // Search used only by SkillAttacher picker
} from 'lucide-react';
import toast from 'react-hot-toast';
import { domainAPI, skillAPI, domainSkillAPI } from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

interface Domain { id: string; name: string; }
interface Skill  { id: string; name: string; level: string; }
interface DomainSkillMapping { id: string; domainId: string; skillId: string; }

// ─────────────────────────────────────────────────────────────────────────────
// Skill picker (attach existing skill to domain)
// ─────────────────────────────────────────────────────────────────────────────
const SkillAttacher: React.FC<{
  domainId: string;
  attached: DomainSkillMapping[];
  allSkills: Skill[];
  onClose: () => void;
}> = ({ domainId, attached, allSkills, onClose }) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const attachedIds = new Set(attached.map((m) => m.skillId));
  const available = allSkills.filter(
    (s) =>
      !attachedIds.has(s.id) &&
      s.name.toLowerCase().includes(search.toLowerCase())
  );

  const attachMut = useMutation({
    mutationFn: (skillId: string) =>
      domainSkillAPI.create({ domainId, skillId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-skills', domainId] });
      toast.success('Skill attached');
    },
    onError: () => toast.error('Failed to attach skill'),
  });

  const detachMut = useMutation({
    mutationFn: (mappingId: string) => domainSkillAPI.delete(mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-skills', domainId] });
      toast.success('Skill removed');
    },
    onError: () => toast.error('Failed to remove skill'),
  });

  const attachedSkills = attached
    .map((m) => ({ mapping: m, skill: allSkills.find((s) => s.id === m.skillId) }))
    .filter((x) => x.skill);

  return (
    <div className="space-y-4">
      {/* Attached skills */}
      {attachedSkills.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-2">Attached skills</p>
          <div className="flex flex-wrap gap-2">
            {attachedSkills.map(({ mapping, skill }) => (
              <span
                key={mapping.id}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs border border-violet-500/30"
              >
                {skill!.name}
                <button
                  onClick={() => detachMut.mutate(mapping.id)}
                  disabled={detachMut.isPending}
                  className="hover:text-rose-400 transition"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Available skills search */}
      <div>
        <p className="text-xs text-slate-500 mb-2">Add from skills library</p>
        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search skills…"
            className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40 transition"
          />
        </div>

        <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
          {available.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-4">
              {allSkills.length === 0
                ? 'No skills in library yet. Create skills first.'
                : 'All skills already attached or none match.'}
            </p>
          ) : (
            available.map((s) => (
              <button
                key={s.id}
                onClick={() => attachMut.mutate(s.id)}
                disabled={attachMut.isPending}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/5 text-left transition group disabled:opacity-50"
              >
                <span className="text-sm text-slate-300 group-hover:text-white transition">
                  {s.name}
                </span>
                <Badge label={s.level} />
              </button>
            ))
          )}
        </div>
      </div>

      <button
        onClick={onClose}
        className="w-full py-2 rounded-xl border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition"
      >
        Done
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Domain row (expandable with skills inline)
// ─────────────────────────────────────────────────────────────────────────────
const DomainRow: React.FC<{
  domain: Domain;
  allSkills: Skill[];
  onEdit: (d: Domain) => void;
  onDelete: (d: Domain) => void;
}> = ({ domain, allSkills, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);

  const { data } = useQuery({
    queryKey: ['domain-skills', domain.id],
    queryFn: () => domainSkillAPI.getByDomain(domain.id),
    enabled: expanded,
  });

  const mappings: DomainSkillMapping[] = data?.data?.data ?? [];
  const attachedSkills = mappings
    .map((m) => allSkills.find((s) => s.id === m.skillId))
    .filter(Boolean) as Skill[];

  return (
    <>
      {/* Domain Row */}
      <div className="border-b border-white/5 last:border-0">
        <div className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition group">
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <Globe size={16} className="text-violet-400 shrink-0" />
          <span className="flex-1 font-medium text-white text-sm">{domain.name}</span>

          {/* Skill preview chips */}
          {!expanded && attachedSkills.length > 0 && (
            <div className="hidden sm:flex gap-1.5 items-center">
              {attachedSkills.slice(0, 3).map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-xs"
                >
                  {s.name}
                </span>
              ))}
              {attachedSkills.length > 3 && (
                <span className="text-xs text-slate-600">
                  +{attachedSkills.length - 3}
                </span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setExpanded(true); setAttachOpen(true); }}
              title="Attach skill"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-violet-400 hover:bg-violet-500/15 border border-violet-500/20 hover:border-violet-500/40 transition"
            >
              <Link2 size={12} /> Attach Skill
            </button>
            <button
              onClick={() => onEdit(domain)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(domain)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Expanded — skills list */}
        {expanded && (
          <div className="pl-14 pr-6 pb-4">
            {mappings.length === 0 ? (
              <p className="text-xs text-slate-600 italic">
                No skills attached. Click "Attach Skill" to add.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {attachedSkills.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Badge label={s.level} />
                    <span className="text-sm text-slate-300">{s.name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Inline attach panel */}
            {attachOpen && (
              <div className="mt-4 p-4 rounded-xl bg-surface-soft border border-white/10">
                <p className="text-xs font-semibold text-violet-300 mb-3">
                  Manage Skills for <span className="text-white">{domain.name}</span>
                </p>
                <SkillAttacher
                  domainId={domain.id}
                  attached={mappings}
                  allSkills={allSkills}
                  onClose={() => setAttachOpen(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attach skill modal (when not expanded) */}
      <Modal
        open={attachOpen && !expanded}
        title={`Skills · ${domain.name}`}
        onClose={() => setAttachOpen(false)}
      >
        <SkillAttacher
          domainId={domain.id}
          attached={mappings}
          allSkills={allSkills}
          onClose={() => setAttachOpen(false)}
        />
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export const DomainsPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Domain | null>(null);
  const [formName, setFormName] = useState('');
  const [delTarget, setDelTarget] = useState<Domain | null>(null);

  const { data: domainsData, isLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: domainAPI.getAll,
  });
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: skillAPI.getAll,
  });

  const domains: Domain[] = domainsData?.data?.data ?? [];
  const allSkills: Skill[] = skillsData?.data?.data ?? [];
  const filtered = domains;

  const createMut = useMutation({
    mutationFn: () => domainAPI.create({ name: formName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Domain created');
      closeModal();
    },
    onError: () => toast.error('Failed to create domain'),
  });

  const updateMut = useMutation({
    mutationFn: () => domainAPI.update(editing!.id, { name: formName.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Domain updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update domain'),
  });

  const deleteMut = useMutation({
    mutationFn: () => domainAPI.delete(delTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domains'] });
      toast.success('Domain deleted');
      setDelTarget(null);
    },
    onError: () => toast.error('Failed to delete domain'),
  });

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setModalOpen(true);
  };

  const openEdit = (d: Domain) => {
    setEditing(d);
    setFormName(d.name);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormName('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    if (editing) updateMut.mutate();
    else createMut.mutate();
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Globe size={22} className="text-violet-400" />
            Domains & Skills
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Expand a domain to view or attach skills from the shared library
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} />
          New Domain
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-4 px-4 py-3 rounded-xl bg-blue-500/8 border border-blue-500/20 text-blue-300 text-xs flex items-start gap-2">
        <span>💡</span>
        <span>
          Skills are <strong>shared</strong> across all domains. Create a skill once in the
          <strong> Skills Library</strong> and attach it to any domain — no duplication needed.
        </span>
      </div>

      {/* Domain list */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No domains yet"
            action={
              <button onClick={openCreate} className="text-xs text-violet-400 hover:underline">
                Create your first domain
              </button>
            }
          />
        ) : (
          filtered.map((d) => (
            <DomainRow
              key={d.id}
              domain={d}
              allSkills={allSkills}
              onEdit={openEdit}
              onDelete={setDelTarget}
            />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">
          {filtered.length} domain{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Domain' : 'Create Domain'}
        onClose={closeModal}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Domain Name" required>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Frontend Development"
              required
              autoFocus
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !formName.trim()}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!delTarget}
        message={`Delete domain "${delTarget?.name}"? All skill mappings for this domain will also be removed.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
