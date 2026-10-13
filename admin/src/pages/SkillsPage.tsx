import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { skillAPI } from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input, Select } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((v) => ({
  label: v,
  value: v,
}));

interface Skill {
  id: string;
  name: string;
  level: string;
}

const emptyForm = { name: '', level: 'BEGINNER' };

export const SkillsPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [delTarget, setDelTarget] = useState<Skill | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['skills'],
    queryFn: skillAPI.getAll,
  });

  const skills: Skill[] = data?.data?.data ?? [];
  const filtered = skills;

  const createMut = useMutation({
    mutationFn: (d: typeof emptyForm) => skillAPI.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill created');
      closeModal();
    },
    onError: () => toast.error('Failed to create skill'),
  });

  const updateMut = useMutation({
    mutationFn: (d: typeof emptyForm) => skillAPI.update(editing!.id, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update skill'),
  });

  const deleteMut = useMutation({
    mutationFn: () => skillAPI.delete(delTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['skills'] });
      toast.success('Skill deleted');
      setDelTarget(null);
    },
    onError: () => toast.error('Failed to delete skill'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (s: Skill) => {
    setEditing(s);
    setForm({ name: s.name, level: s.level });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    if (editing) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers size={22} className="text-blue-400" />
            Skills Library
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Reusable skills — attach any skill to multiple domains
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-blue-900/30"
        >
          <Plus size={16} />
          New Skill
        </button>
      </div>

      {/* Table */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No skills found"
            action={
              <button
                onClick={openCreate}
                className="text-xs text-blue-400 hover:underline"
              >
                Create your first skill
              </button>
            }
          />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wider">
                <th className="text-left px-6 py-3">Name</th>
                <th className="text-left px-6 py-3">Level</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  className={`border-b border-white/5 hover:bg-white/3 transition ${
                    i % 2 === 0 ? '' : 'bg-white/[0.02]'
                  }`}
                >
                  <td className="px-6 py-4 font-medium text-white">{s.name}</td>
                  <td className="px-6 py-4">
                    <Badge label={s.level} />
                  </td>
                  <td className="px-6 py-4 flex justify-end gap-2">
                    <button
                      onClick={() => openEdit(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setDelTarget(s)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Total */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">
          Showing {filtered.length} of {skills.length} skills
        </p>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Skill' : 'Create Skill'}
        onClose={closeModal}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormField label="Skill Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. React.js"
              required
            />
          </FormField>
          <FormField label="Level" required>
            <Select
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
              options={LEVELS}
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
              disabled={isSaving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!delTarget}
        message={`Delete skill "${delTarget?.name}"? It will be removed from all domain mappings.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
