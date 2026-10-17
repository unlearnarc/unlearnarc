import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  BookOpen, FileText, Film, Search, Link2, X, Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  courseAPI, topicAPI, studyMaterialAPI,
  skillAPI, skillCourseAPI,
  domainAPI, domainSkillAPI,
} from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input, Select } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { TopicNotesPanel } from './notes/TopicNotesPanel';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Course { id: string; name: string; level: string; totalTime: string; topicsCount: number; imgUrl?: string; }
interface Topic  { id: string; name: string; level: string; topicOrder: number; time: string; courseId: string; }
interface Material { id: string; type: string; url: string; topicId: string; }
interface Skill  { id: string; name: string; level: string; }
interface SCMapping { id: string; skillId: string; courseId: string; }
interface Domain { id: string; name: string; }
interface DSMapping { id: string; domainId: string; skillId: string; }

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'].map((v) => ({ label: v, value: v }));
const MAT_TYPES = ['VIDEO', 'ARTICLE', 'PDF', 'QUIZ', 'EXERCISE', 'SLIDES'].map((v) => ({ label: v, value: v }));

const materialIcon = (t: string) => {
  if (t === 'VIDEO') return <Film size={13} className="text-purple-400" />;
  if (t === 'ARTICLE') return <FileText size={13} className="text-cyan-400" />;
  return <FileText size={13} className="text-slate-400" />;
};

// ─────────────────────────────────────────────────────────────────────────────
// Study Material Form (inline)
// ─────────────────────────────────────────────────────────────────────────────
const emptySMForm = { type: 'VIDEO', url: '' };

const StudyMaterialRow: React.FC<{ mat: Material; onDelete: (m: Material) => void }> = ({
  mat, onDelete,
}) => (
  <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/3 border border-white/5 group hover:bg-white/5 transition">
    <span>{materialIcon(mat.type)}</span>
    <span className="flex-1 text-xs text-slate-400 truncate">{mat.url}</span>
    <Badge label={mat.type} />
    <button
      onClick={() => onDelete(mat)}
      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-400 transition"
    >
      <Trash2 size={12} />
    </button>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Topic row (expandable with study materials)
// ─────────────────────────────────────────────────────────────────────────────
const TopicRow: React.FC<{
  topic: Topic;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
}> = ({ topic, onEdit, onDelete }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [addMatOpen, setAddMatOpen] = useState(false);
  const [matForm, setMatForm] = useState(emptySMForm);
  const [delMat, setDelMat] = useState<Material | null>(null);

  const { data } = useQuery({
    queryKey: ['materials', topic.id],
    queryFn: () => studyMaterialAPI.getByTopic(topic.id),
    enabled: expanded,
  });
  const materials: Material[] = data?.data?.data ?? [];

  const createMatMut = useMutation({
    mutationFn: () =>
      studyMaterialAPI.create({ type: matForm.type, url: matForm.url, topicId: topic.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials', topic.id] });
      toast.success('Material added');
      setMatForm(emptySMForm);
      setAddMatOpen(false);
    },
    onError: () => toast.error('Failed to add material'),
  });

  const deleteMatMut = useMutation({
    mutationFn: () => studyMaterialAPI.delete(delMat!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['materials', topic.id] });
      toast.success('Material deleted');
      setDelMat(null);
    },
    onError: () => toast.error('Failed to delete material'),
  });

  return (
    <>
      <div className="border-b border-white/5 last:border-0">
        {/* Topic header */}
        <div className="flex items-center gap-3 px-5 py-3 hover:bg-white/[0.02] transition group">
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          <FileText size={14} className="text-amber-400 shrink-0" />
          <span className="flex-1 text-sm text-slate-200">
            <span className="text-slate-500 text-xs mr-2">#{topic.topicOrder}</span>
            {topic.name}
          </span>
          <Badge label={topic.level} />
          <span className="text-xs text-slate-600 hidden sm:block">{topic.time}</span>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setExpanded(true); setAddMatOpen(true); }}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 transition"
            >
              <Plus size={11} /> Material
            </button>
            <button
              onClick={() => onEdit(topic)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(topic)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Study materials */}
        {expanded && (
          <div className="pl-12 pr-5 pb-3 space-y-2">
            {materials.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No study materials yet</p>
            ) : (
              materials.map((m) => (
                <StudyMaterialRow key={m.id} mat={m} onDelete={setDelMat} />
              ))
            )}

            {/* Add material form */}
            {addMatOpen ? (
              <div className="mt-2 p-3 rounded-xl bg-surface-soft border border-white/10 space-y-3">
                <p className="text-xs font-medium text-amber-300">Add Study Material</p>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={matForm.type}
                    onChange={(e) => setMatForm({ ...matForm, type: e.target.value })}
                    options={MAT_TYPES}
                  />
                  <Input
                    value={matForm.url}
                    onChange={(e) => setMatForm({ ...matForm, url: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setAddMatOpen(false); setMatForm(emptySMForm); }}
                    className="flex-1 py-1.5 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 text-xs transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => createMatMut.mutate()}
                    disabled={!matForm.url.trim() || createMatMut.isPending}
                    className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs transition disabled:opacity-50"
                  >
                    {createMatMut.isPending ? 'Adding…' : 'Add'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddMatOpen(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition"
              >
                <Plus size={12} /> Add study material
              </button>
            )}

            {/* Book-style notes (rich, in-app lessons) for this topic */}
            <div className="mt-4 pt-3 border-t border-white/5">
              <TopicNotesPanel parent={{ topicId: topic.id }} />
            </div>
          </div>
        )}
      </div>

      {/* Delete material confirm */}
      <ConfirmDialog
        open={!!delMat}
        message={`Delete this ${delMat?.type} material?`}
        onConfirm={() => deleteMatMut.mutate()}
        onCancel={() => setDelMat(null)}
        loading={deleteMatMut.isPending}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Skill attacher for course
// ─────────────────────────────────────────────────────────────────────────────
const CourseSkillPanel: React.FC<{ course: Course; allSkills: Skill[] }> = ({
  course, allSkills,
}) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');

  const { data } = useQuery({
    queryKey: ['course-skills', course.id],
    queryFn: () => skillCourseAPI.getByCourse(course.id),
  });
  const mappings: SCMapping[] = data?.data?.data ?? [];
  const attachedIds = new Set(mappings.map((m) => m.skillId));
  const available = allSkills.filter(
    (s) => !attachedIds.has(s.id) && s.name.toLowerCase().includes(search.toLowerCase())
  );
  const attachedSkills = mappings
    .map((m) => ({ mapping: m, skill: allSkills.find((s) => s.id === m.skillId) }))
    .filter((x) => x.skill);

  const attachMut = useMutation({
    mutationFn: (skillId: string) =>
      skillCourseAPI.create({ skillId, courseId: course.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-skills', course.id] });
      toast.success('Skill linked');
    },
    onError: () => toast.error('Failed to link skill'),
  });

  const detachMut = useMutation({
    mutationFn: (id: string) => skillCourseAPI.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-skills', course.id] });
      toast.success('Skill unlinked');
    },
    onError: () => toast.error('Failed to unlink skill'),
  });

  return (
    <div className="space-y-3">
      {attachedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {attachedSkills.map(({ mapping, skill }) => (
            <span
              key={mapping.id}
              className="flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs border border-emerald-500/25"
            >
              {skill!.name}
              <button
                onClick={() => detachMut.mutate(mapping.id)}
                className="hover:text-rose-400 transition"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Link a skill…"
          className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500/40 transition"
        />
      </div>
      <div className="max-h-32 overflow-y-auto space-y-0.5">
        {available.map((s) => (
          <button
            key={s.id}
            onClick={() => attachMut.mutate(s.id)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left transition"
          >
            <span className="text-xs text-slate-300">{s.name}</span>
            <Badge label={s.level} />
          </button>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Domain mapper for course (Domain → Skill → Course, two-hop)
// ─────────────────────────────────────────────────────────────────────────────
const CourseDomainPanel: React.FC<{ course: Course; allSkills: Skill[] }> = ({
  course, allSkills,
}) => {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [bridgeSkillId, setBridgeSkillId] = useState('');

  // course → skills (hop 2 reversed)
  const { data: scData } = useQuery({
    queryKey: ['course-skills', course.id],
    queryFn: () => skillCourseAPI.getByCourse(course.id),
  });
  const courseSkillIds: string[] = (scData?.data?.data ?? []).map((m: SCMapping) => m.skillId);

  // all domains
  const { data: domainsData } = useQuery({
    queryKey: ['domains'],
    queryFn: domainAPI.getAll,
  });
  const allDomains: Domain[] = domainsData?.data?.data ?? [];

  // all domain-skill mappings (to resolve which domains already reach this course)
  const { data: dsAllData } = useQuery({
    queryKey: ['domain-skill-all'],
    queryFn: () => domainSkillAPI.getAll(),
  });
  const dsAll: DSMapping[] = dsAllData?.data?.data ?? [];

  // Domains already reachable from this course = those sharing a skill with the course
  const courseSkillSet = new Set(courseSkillIds);
  const mappedDomainIds = new Set(
    dsAll.filter((m) => courseSkillSet.has(m.skillId)).map((m) => m.domainId),
  );
  const mappedDomains = allDomains.filter((d) => mappedDomainIds.has(d.id));
  const availableDomains = allDomains.filter(
    (d) => !mappedDomainIds.has(d.id) && d.name.toLowerCase().includes(search.toLowerCase()),
  );

  // Attaching a domain needs a bridge skill that is already linked to the course.
  const effectiveBridge = bridgeSkillId || courseSkillIds[0] || '';
  const bridgeSkill = allSkills.find((s) => s.id === effectiveBridge);

  const attachMut = useMutation({
    mutationFn: (domainId: string) =>
      domainSkillAPI.create({ domainId, skillId: effectiveBridge }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-skill-all'] });
      toast.success('Course mapped to domain');
    },
    onError: () => toast.error('Failed to map domain'),
  });

  const noSkills = courseSkillIds.length === 0;

  return (
    <div className="space-y-3">
      {mappedDomains.length > 0 && (
        <div>
          <p className="text-[11px] text-slate-500 mb-1.5">Mapped domains (via linked skills)</p>
          <div className="flex flex-wrap gap-1.5">
            {mappedDomains.map((d) => (
              <span
                key={d.id}
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 text-xs border border-violet-500/25"
              >
                <Globe size={11} /> {d.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {noSkills ? (
        <p className="text-xs text-amber-400/90 italic">
          Link at least one skill to this course first (use the "Skills" panel) — domains map
          through a shared skill.
        </p>
      ) : (
        <>
          {/* bridge skill selector — which of the course's skills carries the mapping */}
          {courseSkillIds.length > 1 && (
            <div>
              <p className="text-[11px] text-slate-500 mb-1">Map through skill</p>
              <select
                value={effectiveBridge}
                onChange={(e) => setBridgeSkillId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/40"
              >
                {courseSkillIds.map((id) => (
                  <option key={id} value={id} className="bg-slate-800">
                    {allSkills.find((s) => s.id === id)?.name ?? id}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Map to a domain…"
              className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-xs focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition"
            />
          </div>
          <div className="max-h-32 overflow-y-auto space-y-0.5">
            {availableDomains.length === 0 ? (
              <p className="text-xs text-slate-600 text-center py-2">
                {allDomains.length === 0 ? 'No domains exist yet.' : 'All domains already mapped or none match.'}
              </p>
            ) : (
              availableDomains.map((d) => (
                <button
                  key={d.id}
                  onClick={() => attachMut.mutate(d.id)}
                  disabled={attachMut.isPending || !effectiveBridge}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/5 text-left transition disabled:opacity-50"
                >
                  <Globe size={12} className="text-violet-400" />
                  <span className="text-xs text-slate-300">{d.name}</span>
                </button>
              ))
            )}
          </div>
          {bridgeSkill && (
            <p className="text-[10px] text-slate-600">
              New mappings attach via skill <span className="text-slate-400">{bridgeSkill.name}</span>.
            </p>
          )}
        </>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Course row (expandable with topics + skill panel)
// ─────────────────────────────────────────────────────────────────────────────
const emptyCourseForm = { name: '', level: 'BEGINNER', totalTime: '01:00:00', topicsCount: 1, imgUrl: '' };
const emptyTopicForm  = { name: '', level: 'BEGINNER', topicOrder: 1, time: '00:30:00' };

const CourseRow: React.FC<{
  course: Course;
  allSkills: Skill[];
  onEdit: (c: Course) => void;
  onDelete: (c: Course) => void;
}> = ({ course, allSkills, onEdit, onDelete }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [skillPanelOpen, setSkillPanelOpen] = useState(false);
  const [domainPanelOpen, setDomainPanelOpen] = useState(false);
  const [addTopicOpen, setAddTopicOpen] = useState(false);
  const [topicForm, setTopicForm] = useState(emptyTopicForm);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [delTopic, setDelTopic] = useState<Topic | null>(null);

  const { data: topicsData } = useQuery({
    queryKey: ['topics', course.id],
    queryFn: () => topicAPI.getByCourse(course.id),
    enabled: expanded,
  });
  const topics: Topic[] = topicsData?.data?.data ?? [];

  const createTopicMut = useMutation({
    mutationFn: () =>
      topicAPI.create({ ...topicForm, courseId: course.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics', course.id] });
      toast.success('Topic created');
      setTopicForm(emptyTopicForm);
      setAddTopicOpen(false);
    },
    onError: () => toast.error('Failed to create topic'),
  });

  const updateTopicMut = useMutation({
    mutationFn: () =>
      topicAPI.update(editingTopic!.id, { ...topicForm, courseId: course.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics', course.id] });
      toast.success('Topic updated');
      setEditingTopic(null);
      setTopicForm(emptyTopicForm);
      setAddTopicOpen(false);
    },
    onError: () => toast.error('Failed to update topic'),
  });

  const deleteTopicMut = useMutation({
    mutationFn: () => topicAPI.delete(delTopic!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['topics', course.id] });
      toast.success('Topic deleted');
      setDelTopic(null);
    },
    onError: () => toast.error('Failed to delete topic'),
  });

  const openEditTopic = (t: Topic) => {
    setEditingTopic(t);
    setTopicForm({ name: t.name, level: t.level, topicOrder: t.topicOrder, time: t.time });
    setAddTopicOpen(true);
  };

  const isSavingTopic = createTopicMut.isPending || updateTopicMut.isPending;

  return (
    <>
      <div className="border-b border-white/5 last:border-0">
        {/* Course header */}
        <div className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition group">
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <BookOpen size={16} className="text-emerald-400 shrink-0" />
          <span className="flex-1 font-medium text-white text-sm">{course.name}</span>
          <Badge label={course.level} />
          <span className="text-xs text-slate-500 hidden md:block">
            {topics.length > 0 ? `${topics.length} topics` : `${course.topicsCount} topics`}
          </span>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
            <button
              onClick={() => { setExpanded(true); setSkillPanelOpen(!skillPanelOpen); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-emerald-400 hover:bg-emerald-500/15 border border-emerald-500/20 transition"
            >
              <Link2 size={12} /> Skills
            </button>
            <button
              onClick={() => { setExpanded(true); setDomainPanelOpen(!domainPanelOpen); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-violet-400 hover:bg-violet-500/15 border border-violet-500/20 transition"
            >
              <Globe size={12} /> Domains
            </button>
            <button
              onClick={() => { setExpanded(true); setAddTopicOpen(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-amber-400 hover:bg-amber-500/15 border border-amber-500/20 transition"
            >
              <Plus size={12} /> Topic
            </button>
            <button onClick={() => onEdit(course)} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition">
              <Pencil size={14} />
            </button>
            <button onClick={() => onDelete(course)} className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition">
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Expanded area */}
        {expanded && (
          <div className="pl-12 pr-6 pb-4 space-y-3">
            {/* Skill panel */}
            {skillPanelOpen && (
              <div className="p-3 rounded-xl bg-surface-soft border border-emerald-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-emerald-300">Linked Skills</p>
                  <button onClick={() => setSkillPanelOpen(false)} className="text-slate-500 hover:text-white">
                    <X size={13} />
                  </button>
                </div>
                <CourseSkillPanel course={course} allSkills={allSkills} />
              </div>
            )}

            {/* Domain mapping panel */}
            {domainPanelOpen && (
              <div className="p-3 rounded-xl bg-surface-soft border border-violet-500/20">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-violet-300">Mapped Domains</p>
                  <button onClick={() => setDomainPanelOpen(false)} className="text-slate-500 hover:text-white">
                    <X size={13} />
                  </button>
                </div>
                <CourseDomainPanel course={course} allSkills={allSkills} />
              </div>
            )}

            {/* Topics */}
            {topics.length === 0 ? (
              <p className="text-xs text-slate-600 italic">No topics yet. Click "+ Topic" above.</p>
            ) : (
              <div className="rounded-xl border border-white/8 overflow-hidden">
                {topics
                  .sort((a, b) => a.topicOrder - b.topicOrder)
                  .map((t) => (
                    <TopicRow
                      key={t.id}
                      topic={t}
                      onEdit={openEditTopic}
                      onDelete={setDelTopic}
                    />
                  ))}
              </div>
            )}

            {/* Add/Edit topic form */}
            {addTopicOpen && (
              <div className="p-4 rounded-xl bg-surface-soft border border-amber-500/20 space-y-3">
                <p className="text-xs font-semibold text-amber-300">
                  {editingTopic ? 'Edit Topic' : 'Add Topic'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Name" required>
                    <Input
                      value={topicForm.name}
                      onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                      placeholder="Topic name"
                    />
                  </FormField>
                  <FormField label="Level" required>
                    <Select
                      value={topicForm.level}
                      onChange={(e) => setTopicForm({ ...topicForm, level: e.target.value })}
                      options={LEVELS}
                    />
                  </FormField>
                  <FormField label="Order">
                    <Input
                      type="number"
                      value={topicForm.topicOrder}
                      onChange={(e) => setTopicForm({ ...topicForm, topicOrder: parseInt(e.target.value) })}
                      min={1}
                    />
                  </FormField>
                  <FormField label="Duration (HH:MM:SS)">
                    <Input
                      value={topicForm.time}
                      onChange={(e) => setTopicForm({ ...topicForm, time: e.target.value })}
                      placeholder="00:30:00"
                    />
                  </FormField>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setAddTopicOpen(false);
                      setEditingTopic(null);
                      setTopicForm(emptyTopicForm);
                    }}
                    className="flex-1 py-2 rounded-lg border border-white/10 text-slate-400 hover:bg-white/5 text-sm transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => editingTopic ? updateTopicMut.mutate() : createTopicMut.mutate()}
                    disabled={isSavingTopic || !topicForm.name.trim()}
                    className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm transition disabled:opacity-50"
                  >
                    {isSavingTopic ? 'Saving…' : editingTopic ? 'Update' : 'Add Topic'}
                  </button>
                </div>
              </div>
            )}

            {!addTopicOpen && (
              <button
                onClick={() => { setTopicForm(emptyTopicForm); setEditingTopic(null); setAddTopicOpen(true); }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-amber-400 transition"
              >
                <Plus size={12} /> Add topic
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete topic confirm */}
      <ConfirmDialog
        open={!!delTopic}
        message={`Delete topic "${delTopic?.name}"? All study materials inside will also be deleted.`}
        onConfirm={() => deleteTopicMut.mutate()}
        onCancel={() => setDelTopic(null)}
        loading={deleteTopicMut.isPending}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export const CoursesPage: React.FC = () => {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [form, setForm] = useState(emptyCourseForm);
  const [delTarget, setDelTarget] = useState<Course | null>(null);

  const { data: coursesData, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: courseAPI.getAll,
  });
  const { data: skillsData } = useQuery({
    queryKey: ['skills'],
    queryFn: skillAPI.getAll,
  });

  const courses: Course[] = coursesData?.data?.data ?? [];
  const allSkills: Skill[] = skillsData?.data?.data ?? [];
  const filtered = courses;

  const createMut = useMutation({
    mutationFn: () => courseAPI.create({ ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course created');
      closeModal();
    },
    onError: () => toast.error('Failed to create course'),
  });

  const updateMut = useMutation({
    mutationFn: () => courseAPI.update(editing!.id, { ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course updated');
      closeModal();
    },
    onError: () => toast.error('Failed to update course'),
  });

  const deleteMut = useMutation({
    mutationFn: () => courseAPI.delete(delTarget!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] });
      toast.success('Course deleted');
      setDelTarget(null);
    },
    onError: () => toast.error('Failed to delete course'),
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyCourseForm);
    setModalOpen(true);
  };

  const openEdit = (c: Course) => {
    setEditing(c);
    setForm({
      name: c.name,
      level: c.level,
      totalTime: c.totalTime ?? '01:00:00',
      topicsCount: c.topicsCount ?? 0,
      imgUrl: c.imgUrl ?? '',
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setForm(emptyCourseForm);
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen size={22} className="text-emerald-400" />
            Courses
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Expand a course to manage Topics → Study Materials
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-medium transition shadow-lg shadow-emerald-900/30"
        >
          <Plus size={16} />
          New Course
        </button>
      </div>

      {/* Course list */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No courses yet"
            action={
              <button onClick={openCreate} className="text-xs text-emerald-400 hover:underline">
                Create your first course
              </button>
            }
          />
        ) : (
          filtered.map((c) => (
            <CourseRow
              key={c.id}
              course={c}
              allSkills={allSkills}
              onEdit={openEdit}
              onDelete={setDelTarget}
            />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">
          {filtered.length} course{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? 'Edit Course' : 'Create Course'}
        onClose={closeModal}
        size="md"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
          className="space-y-4"
        >
          <FormField label="Course Name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. React Fundamentals"
              required
              autoFocus
            />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Level" required>
              <Select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                options={LEVELS}
              />
            </FormField>
            <FormField label="Total Duration (HH:MM:SS)">
              <Input
                value={form.totalTime}
                onChange={(e) => setForm({ ...form, totalTime: e.target.value })}
                placeholder="04:00:00"
              />
            </FormField>
            <FormField label="Topics Count">
              <Input
                type="number"
                value={form.topicsCount}
                onChange={(e) => setForm({ ...form, topicsCount: parseInt(e.target.value) })}
                min={0}
              />
            </FormField>
            <FormField label="Image URL">
              <Input
                type="url"
                value={form.imgUrl}
                onChange={(e) => setForm({ ...form, imgUrl: e.target.value })}
                placeholder="https://…/cover.png"
              />
            </FormField>
          </div>

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
              disabled={isSaving || !form.name.trim()}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!delTarget}
        message={`Delete course "${delTarget?.name}"? All topics and study materials inside will also be removed.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelTarget(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
