import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, Briefcase, X, Search, Link2, Map, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { roleAPI, domainAPI, skillAPI } from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

interface Role { id: string; name: string; description?: string; }
interface Domain { id: string; name: string; }
interface Skill { id: string; name: string; level: string; }

interface RoadmapCourse {
  courseId: string; courseName: string; level: string;
  topicsCount: number; totalTime: string | null; completed: boolean;
}
interface RoadmapSkill { skillId: string; skillName: string; level: string; courses: RoadmapCourse[]; }
interface RoadmapStage { level: string; order: number; skills: RoadmapSkill[]; }
interface Roadmap {
  roleId: string; roleName: string; roleDescription?: string;
  totalSkills: number; totalCourses: number; completedCourses: number; progressPercent: number;
  stages: RoadmapStage[];
  domains: { id: string; name: string }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapping manager — attach/detach domains & skills to a role, with live roadmap
// ─────────────────────────────────────────────────────────────────────────────
const RoleMappingPanel: React.FC<{
  role: Role;
  allDomains: Domain[];
  allSkills: Skill[];
}> = ({ role, allDomains, allSkills }) => {
  const qc = useQueryClient();
  const [domainSearch, setDomainSearch] = useState('');
  const [skillSearch, setSkillSearch] = useState('');

  // The roadmap doubles as the source of truth for what's currently mapped.
  const { data, isLoading } = useQuery({
    queryKey: ['roadmap', role.id],
    queryFn: () => roleAPI.roadmap(role.id),
  });
  const roadmap: Roadmap | undefined = data?.data?.data;

  const mappedDomainIds = new Set((roadmap?.domains ?? []).map((d) => d.id));
  // Skills reachable via the roadmap (domain-derived + direct) — used to grey out.
  const mappedSkillIds = new Set(
    (roadmap?.stages ?? []).flatMap((s) => s.skills.map((sk) => sk.skillId)),
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: ['roadmap', role.id] });

  const addDomain = useMutation({
    mutationFn: (domainId: string) => roleAPI.addDomain(role.id, domainId),
    onSuccess: () => { invalidate(); toast.success('Domain mapped'); },
    onError: () => toast.error('Failed to map domain'),
  });
  const removeDomain = useMutation({
    mutationFn: (domainId: string) => roleAPI.removeDomain(role.id, domainId),
    onSuccess: () => { invalidate(); toast.success('Domain removed'); },
    onError: () => toast.error('Failed to remove domain'),
  });
  const addSkill = useMutation({
    mutationFn: (skillId: string) => roleAPI.addSkill(role.id, skillId),
    onSuccess: () => { invalidate(); toast.success('Skill mapped'); },
    onError: () => toast.error('Failed to map skill'),
  });

  const availableDomains = allDomains.filter(
    (d) => !mappedDomainIds.has(d.id) && d.name.toLowerCase().includes(domainSearch.toLowerCase()),
  );
  const availableSkills = allSkills.filter(
    (s) => !mappedSkillIds.has(s.id) && s.name.toLowerCase().includes(skillSearch.toLowerCase()),
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── Mapping column ── */}
      <div className="space-y-5">
        {/* Domains */}
        <div>
          <p className="text-xs font-semibold text-violet-300 mb-2">Domains</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {(roadmap?.domains ?? []).length === 0 && (
              <span className="text-xs text-slate-600 italic">No domains mapped yet.</span>
            )}
            {(roadmap?.domains ?? []).map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-full bg-violet-500/15 text-violet-300 text-xs border border-violet-500/30"
              >
                {d.name}
                <button
                  onClick={() => removeDomain.mutate(d.id)}
                  disabled={removeDomain.isPending}
                  className="hover:text-rose-400 transition"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={domainSearch}
              onChange={(e) => setDomainSearch(e.target.value)}
              placeholder="Search domains to add…"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {availableDomains.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-3">No matching domains.</p>
            ) : availableDomains.map((d) => (
              <button
                key={d.id}
                onClick={() => addDomain.mutate(d.id)}
                disabled={addDomain.isPending}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/5 text-left transition group"
              >
                <span className="text-sm text-slate-300 group-hover:text-white">{d.name}</span>
                <Link2 size={12} className="text-violet-400" />
              </button>
            ))}
          </div>
        </div>

        {/* Direct skills */}
        <div>
          <p className="text-xs font-semibold text-indigo-300 mb-2">
            Direct Skills <span className="text-slate-500 font-normal">(in addition to domain skills)</span>
          </p>
          <div className="relative mb-2">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={skillSearch}
              onChange={(e) => setSkillSearch(e.target.value)}
              placeholder="Search skills to add directly…"
              className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
            {availableSkills.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-3">
                All matching skills are already covered.
              </p>
            ) : availableSkills.map((s) => (
              <button
                key={s.id}
                onClick={() => addSkill.mutate(s.id)}
                disabled={addSkill.isPending}
                className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg hover:bg-white/5 text-left transition group"
              >
                <span className="text-sm text-slate-300 group-hover:text-white">{s.name}</span>
                <Badge label={s.level} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Live roadmap preview column ── */}
      <div className="rounded-xl bg-surface-soft border border-white/10 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Map size={15} className="text-emerald-400" />
          <p className="text-xs font-semibold text-emerald-300">Roadmap Preview</p>
        </div>

        {isLoading ? (
          <p className="text-xs text-slate-500 py-6 text-center">Building…</p>
        ) : !roadmap || roadmap.stages.length === 0 ? (
          <p className="text-xs text-slate-600 py-6 text-center italic">
            Map domains or skills to see the generated roadmap.
          </p>
        ) : (
          <>
            <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
              <span>{roadmap.totalSkills} skills</span>
              <span>·</span>
              <span>{roadmap.totalCourses} courses</span>
            </div>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
              {roadmap.stages.map((stage) => (
                <div key={stage.level}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold flex items-center justify-center">
                      {stage.order + 1}
                    </span>
                    <Badge label={stage.level} />
                  </div>
                  <div className="pl-7 space-y-2">
                    {stage.skills.map((sk) => (
                      <div key={sk.skillId}>
                        <p className="text-xs font-medium text-slate-300">{sk.skillName}</p>
                        {sk.courses.length === 0 ? (
                          <p className="text-[10px] text-slate-600 italic pl-2">
                            No courses mapped to this skill yet.
                          </p>
                        ) : (
                          <ul className="pl-2 mt-1 space-y-0.5">
                            {sk.courses.map((c) => (
                              <li key={c.courseId} className="flex items-center gap-1.5 text-[11px] text-slate-400">
                                <BookOpen size={10} className="text-indigo-400 shrink-0" />
                                {c.courseName}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export const RolesPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });
  const [delTarget, setDelTarget] = useState<Role | null>(null);
  const [mapTarget, setMapTarget] = useState<Role | null>(null);

  const { data: rolesData, isLoading } = useQuery({ queryKey: ['roles'], queryFn: roleAPI.getAll });
  const { data: domainsData } = useQuery({ queryKey: ['domains'], queryFn: domainAPI.getAll });
  const { data: skillsData } = useQuery({ queryKey: ['skills'], queryFn: skillAPI.getAll });

  const roles: Role[] = rolesData?.data?.data ?? [];
  const allDomains: Domain[] = domainsData?.data?.data ?? [];
  const allSkills: Skill[] = skillsData?.data?.data ?? [];

  const createMut = useMutation({
    mutationFn: () => roleAPI.create({ name: form.name.trim(), description: form.description.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role created'); closeModal(); },
    onError: () => toast.error('Failed to create role'),
  });
  const updateMut = useMutation({
    mutationFn: () => roleAPI.update(editing!.id, { name: form.name.trim(), description: form.description.trim() || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role updated'); closeModal(); },
    onError: () => toast.error('Failed to update role'),
  });
  const deleteMut = useMutation({
    mutationFn: () => roleAPI.delete(delTarget!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['roles'] }); toast.success('Role deleted'); setDelTarget(null); },
    onError: () => toast.error('Failed to delete role'),
  });

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '' }); setModalOpen(true); };
  const openEdit = (r: Role) => { setEditing(r); setForm({ name: r.name, description: r.description ?? '' }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); setForm({ name: '', description: '' }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    editing ? updateMut.mutate() : createMut.mutate();
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Briefcase size={22} className="text-violet-400" />
            Roles & Roadmaps
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Define a role, map the domains & skills it needs — the course roadmap is generated automatically.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} /> New Role
        </button>
      </div>

      {/* Role list */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : roles.length === 0 ? (
          <EmptyState
            message="No roles yet"
            action={<button onClick={openCreate} className="text-xs text-violet-400 hover:underline">Create your first role</button>}
          />
        ) : (
          roles.map((r) => (
            <div key={r.id} className="border-b border-white/5 last:border-0">
              <div className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition group">
                <Briefcase size={16} className="text-violet-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white text-sm">{r.name}</span>
                  {r.description && <p className="text-xs text-slate-500 truncate">{r.description}</p>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button
                    onClick={() => setMapTarget(r)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 hover:border-emerald-500/40 transition"
                  >
                    <Map size={12} /> Build Roadmap
                  </button>
                  <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDelTarget(r)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {roles.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">{roles.length} role{roles.length !== 1 ? 's' : ''}</p>
      )}

      {/* Create/Edit Modal */}
      <Modal open={modalOpen} title={editing ? 'Edit Role' : 'Create Role'} onClose={closeModal} size="sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Role Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Backend Developer"
              required
              autoFocus
            />
          </FormField>
          <FormField label="Description">
            <Input
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Short summary of the role"
            />
          </FormField>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={closeModal} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition">Cancel</button>
            <button type="submit" disabled={isSaving || !form.name.trim()} className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-50">
              {isSaving ? 'Saving…' : editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Roadmap builder modal */}
      <Modal
        open={!!mapTarget}
        title={mapTarget ? `Roadmap · ${mapTarget.name}` : ''}
        onClose={() => setMapTarget(null)}
        size="lg"
      >
        {mapTarget && (
          <RoleMappingPanel role={mapTarget} allDomains={allDomains} allSkills={allSkills} />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!delTarget}
        message={`Delete role "${delTarget?.name}"? Its domain & skill mappings will also be removed.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
