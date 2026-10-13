import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  Database, HelpCircle, CheckCircle, XCircle,
  ToggleLeft, ToggleRight, AlertCircle, BookOpen, Globe, FileText,
  Layers, ClipboardList, PlusCircle, MinusCircle, Link2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { poolAPI, questionAPI, domainAPI, courseAPI, topicAPI } from '../api/endpoints';
import { Modal } from '../components/ui/Modal';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField, Input, Select } from '../components/ui/FormField';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';

// ── Types ──────────────────────────────────────────────────────────────────────
type ScopeType  = 'DOMAIN' | 'COURSE' | 'TOPIC';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type QType      = 'MCQ' | 'MULTIPLE_CORRECT';

interface Pool {
  id: string; name: string; description: string; scopeType: ScopeType;
  totalQuestions: number; easyCount: number; mediumCount: number; hardCount: number;
  passPercentage: number; timeLimitMinutes: number; isActive: boolean; createdAt: string;
  activeQuestionCount: number; easyAvailable: number; mediumAvailable: number; hardAvailable: number;
}
interface AnswerReq  { answerText: string; isCorrect: boolean; displayOrder: number; }
interface AnswerResp { id: string; questionId: string; answerText: string; isCorrect: boolean; displayOrder: number; }
interface Question {
  id: string; poolId: string; questionText: string; questionType: QType;
  difficulty: Difficulty; points: number; explanation: string; isActive: boolean;
  createdAt: string; answers: AnswerResp[];
}
interface Domain  { id: string; name: string; }
interface Course  { id: string; name: string; }
interface Topic   { id: string; name: string; courseId: string; }

// ── Constants ──────────────────────────────────────────────────────────────────
const SCOPES:  { label: string; value: ScopeType  }[] = [
  { label: 'Domain Level', value: 'DOMAIN'  },
  { label: 'Course Level', value: 'COURSE'  },
  { label: 'Topic Level',  value: 'TOPIC'   },
];
const DIFFS:   { label: string; value: Difficulty }[] = [
  { label: 'Easy',   value: 'EASY'   },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'Hard',   value: 'HARD'   },
];
const QTYPES:  { label: string; value: QType }[] = [
  { label: 'Single correct (MCQ)',          value: 'MCQ'              },
  { label: 'Multiple correct',              value: 'MULTIPLE_CORRECT' },
];

const diffColor: Record<Difficulty, string> = {
  EASY:   'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  HARD:   'bg-rose-500/15 text-rose-400 border-rose-500/30',
};
const scopeColor: Record<ScopeType, string> = {
  DOMAIN: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  COURSE: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  TOPIC:  'bg-blue-500/15 text-blue-400 border-blue-500/30',
};
const scopeIcon = (s: ScopeType) =>
  s === 'DOMAIN' ? <Globe size={13} className="text-violet-400" /> :
  s === 'COURSE' ? <BookOpen size={13} className="text-emerald-400" /> :
                   <FileText size={13} className="text-blue-400" />;

const emptyPool = {
  name: '', description: '', scopeType: 'COURSE' as ScopeType,
  totalQuestions: 9, easyCount: 3, mediumCount: 3, hardCount: 3,
  passPercentage: 60, timeLimitMinutes: 30,
};

const emptyAnswer: AnswerReq = { answerText: '', isCorrect: false, displayOrder: 0 };
const emptyQuestion = {
  questionText: '', questionType: 'MCQ' as QType, difficulty: 'EASY' as Difficulty,
  points: 1, explanation: '',
  answers: [
    { ...emptyAnswer, displayOrder: 0 },
    { ...emptyAnswer, displayOrder: 1 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Answer editor row
// ─────────────────────────────────────────────────────────────────────────────
const AnswerEditor: React.FC<{
  answers:  AnswerReq[];
  qtype:    QType;
  onChange: (answers: AnswerReq[]) => void;
}> = ({ answers, qtype, onChange }) => {
  const setAnswer = (i: number, patch: Partial<AnswerReq>) => {
    const next = answers.map((a, idx) => {
      if (idx !== i) {
        // MCQ: uncheck all others when this one becomes correct
        if (qtype === 'MCQ' && patch.isCorrect) return { ...a, isCorrect: false };
        return a;
      }
      return { ...a, ...patch };
    });
    onChange(next);
  };

  const addAnswer = () =>
    onChange([...answers, { answerText: '', isCorrect: false, displayOrder: answers.length }]);

  const removeAnswer = (i: number) =>
    onChange(answers.filter((_, idx) => idx !== i).map((a, idx) => ({ ...a, displayOrder: idx })));

  const correctCount = answers.filter((a) => a.isCorrect).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Answers</p>
        <div className="flex items-center gap-3">
          {qtype === 'MCQ' && correctCount !== 1 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={11} /> MCQ needs exactly 1 correct
            </span>
          )}
          {qtype === 'MULTIPLE_CORRECT' && correctCount < 2 && (
            <span className="text-xs text-amber-400 flex items-center gap-1">
              <AlertCircle size={11} /> Need ≥ 2 correct answers
            </span>
          )}
          {answers.length < 10 && (
            <button
              type="button"
              onClick={addAnswer}
              className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 transition"
            >
              <PlusCircle size={13} /> Add option
            </button>
          )}
        </div>
      </div>

      {answers.map((ans, i) => (
        <div key={i} className="flex items-center gap-2">
          {/* Option letter */}
          <span className="w-6 h-6 flex items-center justify-center rounded-full bg-white/5 text-slate-500 text-xs font-bold shrink-0">
            {String.fromCharCode(65 + i)}
          </span>

          {/* Text */}
          <input
            value={ans.answerText}
            onChange={(e) => setAnswer(i, { answerText: e.target.value })}
            placeholder={`Option ${String.fromCharCode(65 + i)}`}
            className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-600 text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition"
          />

          {/* Correct toggle */}
          <button
            type="button"
            title={ans.isCorrect ? 'Mark incorrect' : 'Mark correct'}
            onClick={() => setAnswer(i, { isCorrect: !ans.isCorrect })}
            className={`shrink-0 p-1.5 rounded-lg border transition ${
              ans.isCorrect
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                : 'bg-white/5 border-white/10 text-slate-600 hover:text-slate-400'
            }`}
          >
            <CheckCircle size={14} />
          </button>

          {/* Remove (keep min 2) */}
          <button
            type="button"
            onClick={() => removeAnswer(i)}
            disabled={answers.length <= 2}
            className="shrink-0 p-1.5 rounded-lg text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <MinusCircle size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Question Form Modal
// ─────────────────────────────────────────────────────────────────────────────
const QuestionFormModal: React.FC<{
  open: boolean;
  poolId: string;
  editing: Question | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, poolId, editing, onClose, onSaved }) => {
  const [form, setForm] = useState(emptyQuestion);

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          questionText: editing.questionText,
          questionType: editing.questionType,
          difficulty:   editing.difficulty,
          points:       editing.points,
          explanation:  editing.explanation ?? '',
          answers: editing.answers.map((a) => ({
            answerText:   a.answerText,
            isCorrect:    a.isCorrect,
            displayOrder: a.displayOrder,
          })),
        });
      } else {
        setForm({ ...emptyQuestion, answers: [
          { ...emptyAnswer, displayOrder: 0 },
          { ...emptyAnswer, displayOrder: 1 },
        ]});
      }
    }
  }, [open, editing]);

  const createMut = useMutation({
    mutationFn: () => questionAPI.create({ ...form, poolId }),
    onSuccess: () => { toast.success('Question created'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create question'),
  });
  const updateMut = useMutation({
    mutationFn: () => questionAPI.update(editing!.id, { ...form, poolId }),
    onSuccess: () => { toast.success('Question updated'); onSaved(); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update question'),
  });

  const valid = () => {
    if (!form.questionText.trim()) return false;
    if (form.answers.length < 2) return false;
    if (form.answers.some((a) => !a.answerText.trim())) return false;
    const correctCount = form.answers.filter((a) => a.isCorrect).length;
    if (form.questionType === 'MCQ' && correctCount !== 1) return false;
    if (form.questionType === 'MULTIPLE_CORRECT' && correctCount < 2) return false;
    return true;
  };

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} title={editing ? 'Edit Question' : 'Add Question'} onClose={onClose} size="lg">
      <form
        onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
        className="space-y-4 max-h-[75vh] overflow-y-auto pr-1"
      >
        {/* Question text */}
        <FormField label="Question Text" required>
          <textarea
            value={form.questionText}
            onChange={(e) => setForm({ ...form, questionText: e.target.value })}
            rows={3}
            placeholder="Enter the question…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-none"
          />
        </FormField>

        {/* Type / Difficulty / Points */}
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Type" required>
            <Select
              value={form.questionType}
              onChange={(e) => setForm({ ...form, questionType: e.target.value as QType })}
              options={QTYPES}
            />
          </FormField>
          <FormField label="Difficulty" required>
            <Select
              value={form.difficulty}
              onChange={(e) => setForm({ ...form, difficulty: e.target.value as Difficulty })}
              options={DIFFS}
            />
          </FormField>
          <FormField label="Points">
            <Input
              type="number" min={1} max={100}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: parseInt(e.target.value) || 1 })}
            />
          </FormField>
        </div>

        {/* Answers */}
        <div className="p-4 rounded-xl bg-bg border border-white/8">
          <AnswerEditor
            answers={form.answers}
            qtype={form.questionType}
            onChange={(answers) => setForm({ ...form, answers })}
          />
        </div>

        {/* Explanation */}
        <FormField label="Explanation (shown after grading)">
          <textarea
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            rows={2}
            placeholder="Why is this the correct answer?"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-none"
          />
        </FormField>

        {/* Actions */}
        <div className="flex gap-3 pt-1 sticky bottom-0 bg-surface-raised pb-1">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving || !valid()}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Add Question'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Question Row
// ─────────────────────────────────────────────────────────────────────────────
const QuestionRow: React.FC<{
  q: Question;
  idx: number;
  onEdit: (q: Question) => void;
  onDelete: (q: Question) => void;
  onToggle: (q: Question) => void;
}> = ({ q, idx, onEdit, onDelete, onToggle }) => {
  const [expanded, setExpanded] = useState(false);
  const correctAnswers = q.answers.filter((a) => a.isCorrect);

  return (
    <div className={`border-b border-white/5 last:border-0 ${!q.isActive ? 'opacity-50' : ''}`}>
      {/* Header */}
      <div className="flex items-start gap-3 px-5 py-3 hover:bg-white/[0.02] transition group">
        <button onClick={() => setExpanded(!expanded)} className="mt-0.5 text-slate-500 hover:text-white shrink-0">
          {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {/* Number */}
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/8 text-slate-500 text-xs font-bold mt-0.5 shrink-0">
          {idx + 1}
        </span>

        {/* Question text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-200 leading-snug line-clamp-2">{q.questionText}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${diffColor[q.difficulty]}`}>
              {q.difficulty}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400 border border-white/8">
              {q.questionType === 'MCQ' ? 'MCQ' : 'Multi-correct'}
            </span>
            <span className="text-xs text-slate-600">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
            <span className="text-xs text-emerald-500">
              {correctAnswers.length} correct / {q.answers.length} options
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
          <button
            onClick={() => onToggle(q)}
            title={q.isActive ? 'Disable' : 'Enable'}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
          >
            {q.isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
          </button>
          <button
            onClick={() => onEdit(q)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => onDelete(q)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Expanded answers */}
      {expanded && (
        <div className="pl-16 pr-5 pb-4 space-y-2">
          {q.answers
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((ans, i) => (
              <div
                key={ans.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
                  ans.isCorrect
                    ? 'bg-emerald-500/8 border-emerald-500/25 text-emerald-300'
                    : 'bg-white/3 border-white/5 text-slate-400'
                }`}
              >
                <span className="w-5 h-5 flex items-center justify-center rounded-full bg-white/10 text-xs font-bold text-slate-400 shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="flex-1 text-sm">{ans.answerText}</span>
                {ans.isCorrect ? (
                  <CheckCircle size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <XCircle size={14} className="text-slate-600 shrink-0" />
                )}
              </div>
            ))}

          {q.explanation && (
            <div className="mt-2 px-3 py-2 rounded-lg bg-blue-500/8 border border-blue-500/20 text-xs text-blue-300">
              <span className="font-semibold">Explanation:</span> {q.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pool mapping modal (link pool to entity)
// ─────────────────────────────────────────────────────────────────────────────
const PoolMapModal: React.FC<{
  open: boolean;
  pool: Pool;
  onClose: () => void;
}> = ({ open, pool, onClose }) => {
  const [entityId, setEntityId] = useState('');

  const { data: domainsData }  = useQuery({ queryKey: ['domains'],  queryFn: domainAPI.getAll,  enabled: open && pool.scopeType === 'DOMAIN'  });
  const { data: coursesData }  = useQuery({ queryKey: ['courses'],  queryFn: courseAPI.getAll,  enabled: open && pool.scopeType === 'COURSE'  });
  const { data: topicsData }   = useQuery({ queryKey: ['topics-all'], queryFn: topicAPI.getAll, enabled: open && pool.scopeType === 'TOPIC' });

  const domains:  Domain[] = Array.isArray(domainsData?.data?.data) ? domainsData!.data.data : [];
  const courses:  Course[] = Array.isArray(coursesData?.data?.data) ? coursesData!.data.data : [];
  const topics:   Topic[]  = Array.isArray(topicsData?.data?.data)  ? topicsData!.data.data  : [];

  const options =
    pool.scopeType === 'DOMAIN' ? domains.map((d) => ({ label: d.name, value: d.id })) :
    pool.scopeType === 'COURSE' ? courses.map((c) => ({ label: c.name, value: c.id })) :
    topics.map((t) => ({ label: t.name, value: t.id }));

  const mapMut = useMutation({
    mutationFn: () => poolAPI.map({
      poolId:   pool.id,
      domainId: pool.scopeType === 'DOMAIN' ? entityId : null,
      courseId: pool.scopeType === 'COURSE' ? entityId : null,
      topicId:  pool.scopeType === 'TOPIC'  ? entityId : null,
    }),
    onSuccess: () => { toast.success('Pool linked successfully'); onClose(); setEntityId(''); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to link pool'),
  });

  return (
    <Modal open={open} title={`Link Pool → ${pool.scopeType}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Link <span className="text-white font-medium">"{pool.name}"</span> to a{' '}
          {pool.scopeType.toLowerCase()} so tests can be generated from it.
        </p>
        <FormField label={`Select ${pool.scopeType.charAt(0) + pool.scopeType.slice(1).toLowerCase()}`} required>
          <Select
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            options={options}
            placeholder={`Choose ${pool.scopeType.toLowerCase()}…`}
          />
        </FormField>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition">
            Cancel
          </button>
          <button
            onClick={() => mapMut.mutate()}
            disabled={!entityId || mapMut.isPending}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-40"
          >
            {mapMut.isPending ? 'Linking…' : 'Link Pool'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pool expanded panel — shows questions + add question button
// ─────────────────────────────────────────────────────────────────────────────
const PoolQuestionsPanel: React.FC<{ pool: Pool }> = ({ pool }) => {
  const qc = useQueryClient();
  const [diffFilter, setDiff] = useState<Difficulty | 'ALL'>('ALL');
  const [qModalOpen, setQModal] = useState(false);
  // search removed — rely on top banner only
  const [editingQ, setEditingQ] = useState<Question | null>(null);
  const [delQ, setDelQ]         = useState<Question | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['questions', pool.id],
    queryFn: () => questionAPI.getByPool(pool.id),
  });
  const questions: Question[] = data?.data?.data ?? [];

  const filtered = questions.filter((q) =>
    diffFilter === 'ALL' || q.difficulty === diffFilter
  );

  const toggleMut = useMutation({
    mutationFn: (q: Question) => questionAPI.toggleActive(q.id),
    onSuccess: (_, q) => {
      qc.invalidateQueries({ queryKey: ['questions', pool.id] });
      toast.success(`Question ${q.isActive ? 'disabled' : 'enabled'}`);
    },
    onError: () => toast.error('Failed to toggle question'),
  });

  const deleteMut = useMutation({
    mutationFn: () => questionAPI.delete(delQ!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['questions', pool.id] });
      qc.invalidateQueries({ queryKey: ['pools'] });
      toast.success('Question deleted');
      setDelQ(null);
    },
    onError: () => toast.error('Failed to delete question'),
  });

  // Stats
  const easy   = questions.filter((q) => q.difficulty === 'EASY'   && q.isActive).length;
  const medium = questions.filter((q) => q.difficulty === 'MEDIUM'  && q.isActive).length;
  const hard   = questions.filter((q) => q.difficulty === 'HARD'    && q.isActive).length;

  return (
    <>
      {/* Stat pills + controls */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          {([['EASY', easy, pool.easyCount, 'text-emerald-400'],
             ['MEDIUM', medium, pool.mediumCount, 'text-amber-400'],
             ['HARD', hard, pool.hardCount, 'text-rose-400']] as const).map(([d, count, need, color]) => (
            <div key={d} className={`flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs ${color}`}>
              <span className="font-bold">{count}</span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{need} {d.toLowerCase()}</span>
              {count < need && <AlertCircle size={11} className="text-amber-400 ml-0.5" />}
            </div>
          ))}
        </div>

        <div className="flex-1" />

        {/* Difficulty filter */}
        <select
          value={diffFilter}
          onChange={(e) => setDiff(e.target.value as Difficulty | 'ALL')}
          className="px-2.5 py-1.5 rounded-lg bg-surface-soft border border-white/10 text-slate-300 text-xs focus:outline-none"
        >
          <option value="ALL">All difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </select>

        {/* Add question */}
        <button
          onClick={() => { setEditingQ(null); setQModal(true); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium transition"
        >
          <Plus size={13} /> Add Question
        </button>
      </div>

      {/* Question list */}
      {isLoading ? (
        <div className="text-xs text-slate-500 py-4 text-center">Loading questions…</div>
      ) : filtered.length === 0 ? (
        <div className="text-xs text-slate-600 py-6 text-center italic">
          {questions.length === 0
            ? 'No questions yet. Click "Add Question" to start building this pool.'
            : 'No questions match your filters.'}
        </div>
      ) : (
        <div className="rounded-xl border border-white/8 overflow-hidden">
          {filtered.map((q, i) => (
            <QuestionRow
              key={q.id}
              q={q}
              idx={filtered.indexOf(q)}
              onEdit={(q) => { setEditingQ(q); setQModal(true); }}
              onDelete={setDelQ}
              onToggle={(q) => toggleMut.mutate(q)}
            />
          ))}
        </div>
      )}

      {/* Question form modal */}
      <QuestionFormModal
        open={qModalOpen}
        poolId={pool.id}
        editing={editingQ}
        onClose={() => { setQModal(false); setEditingQ(null); }}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['questions', pool.id] });
          qc.invalidateQueries({ queryKey: ['pools'] });
        }}
      />

      {/* Delete question confirm */}
      <ConfirmDialog
        open={!!delQ}
        message={`Delete this question and all its answers?`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelQ(null)}
        loading={deleteMut.isPending}
      />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pool Row
// ─────────────────────────────────────────────────────────────────────────────
const PoolRow: React.FC<{
  pool: Pool;
  onEdit: (p: Pool) => void;
  onDelete: (p: Pool) => void;
}> = ({ pool, onEdit, onDelete }) => {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [mapOpen, setMapOpen]   = useState(false);

  const toggleMut = useMutation({
    mutationFn: () => poolAPI.toggleActive(pool.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pools'] });
      toast.success(`Pool ${pool.isActive ? 'disabled' : 'enabled'}`);
    },
    onError: () => toast.error('Failed to toggle pool'),
  });

  // Readiness — check if pool has enough questions
  const ready =
    (pool.easyAvailable   ?? 0) >= pool.easyCount &&
    (pool.mediumAvailable ?? 0) >= pool.mediumCount &&
    (pool.hardAvailable   ?? 0) >= pool.hardCount;

  return (
    <>
      <div className={`border-b border-white/5 last:border-0 ${!pool.isActive ? 'opacity-60' : ''}`}>
        {/* Pool header */}
        <div className="flex items-center gap-3 px-6 py-4 hover:bg-white/[0.02] transition group">
          <button onClick={() => setExpanded(!expanded)} className="text-slate-500 hover:text-white shrink-0">
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          <Database size={16} className="text-violet-400 shrink-0" />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-white text-sm">{pool.name}</span>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${scopeColor[pool.scopeType]}`}>
                {scopeIcon(pool.scopeType)} {pool.scopeType}
              </span>
              {!pool.isActive && (
                <span className="inline-flex px-2 py-0.5 rounded-full text-xs bg-slate-700/40 text-slate-500 border border-white/8">
                  Disabled
                </span>
              )}
              {pool.isActive && !ready && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  <AlertCircle size={11} /> Needs more questions
                </span>
              )}
              {pool.isActive && ready && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle size={11} /> Ready
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {pool.totalQuestions}Q · {pool.easyCount}E/{pool.mediumCount}M/{pool.hardCount}H · {pool.passPercentage}% pass
              {pool.timeLimitMinutes > 0 && ` · ${pool.timeLimitMinutes}min`}
            </p>
          </div>

          {/* Active question counts */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            <span className="text-emerald-500">{pool.easyAvailable ?? 0}E</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-500">{pool.mediumAvailable ?? 0}M</span>
            <span className="text-slate-600">/</span>
            <span className="text-rose-500">{pool.hardAvailable ?? 0}H</span>
            <span className="text-slate-600 ml-1">available</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
            <button
              onClick={() => setMapOpen(true)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-blue-400 hover:bg-blue-500/15 border border-blue-500/20 transition"
            >
              <Link2 size={12} /> Link
            </button>
            <button
              onClick={() => toggleMut.mutate()}
              title={pool.isActive ? 'Disable pool' : 'Enable pool'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition"
            >
              {pool.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
            </button>
            <button
              onClick={() => onEdit(pool)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => onDelete(pool)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Expanded: question panel */}
        {expanded && (
          <div className="px-8 pb-5">
            <PoolQuestionsPanel pool={pool} />
          </div>
        )}
      </div>

      {/* Map modal */}
      <PoolMapModal open={mapOpen} pool={pool} onClose={() => setMapOpen(false)} />
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Pool Form Modal
// ─────────────────────────────────────────────────────────────────────────────
const PoolFormModal: React.FC<{
  open: boolean;
  editing: Pool | null;
  onClose: () => void;
}> = ({ open, editing, onClose }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyPool);

  React.useEffect(() => {
    if (open) {
      setForm(editing ? {
        name: editing.name, description: editing.description ?? '',
        scopeType: editing.scopeType,
        totalQuestions: editing.totalQuestions, easyCount: editing.easyCount,
        mediumCount: editing.mediumCount, hardCount: editing.hardCount,
        passPercentage: editing.passPercentage, timeLimitMinutes: editing.timeLimitMinutes,
      } : { ...emptyPool });
    }
  }, [open, editing]);

  const distributionOk =
    (form.easyCount + form.mediumCount + form.hardCount) === form.totalQuestions;

  const createMut = useMutation({
    mutationFn: () => poolAPI.create({ ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pools'] });
      toast.success('Pool created');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to create pool'),
  });

  const updateMut = useMutation({
    mutationFn: () => poolAPI.update(editing!.id, { ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pools'] });
      toast.success('Pool updated');
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to update pool'),
  });

  const isSaving = createMut.isPending || updateMut.isPending;

  return (
    <Modal open={open} title={editing ? 'Edit Pool' : 'Create Question Pool'} onClose={onClose} size="md">
      <form
        onSubmit={(e) => { e.preventDefault(); editing ? updateMut.mutate() : createMut.mutate(); }}
        className="space-y-4"
      >
        <FormField label="Pool Name" required>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Java Basics — Course Pool"
            autoFocus
          />
        </FormField>

        <FormField label="Description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            placeholder="Optional description…"
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition resize-none"
          />
        </FormField>

        <FormField label="Scope" required>
          <Select
            value={form.scopeType}
            onChange={(e) => setForm({ ...form, scopeType: e.target.value as ScopeType })}
            options={SCOPES}
          />
        </FormField>

        {/* Distribution */}
        <div>
          <p className="text-sm font-medium text-slate-300 mb-2">
            Question Distribution
            {!distributionOk && (
              <span className="ml-2 text-xs text-amber-400">
                (Easy+Medium+Hard must equal Total: {form.easyCount+form.mediumCount+form.hardCount} ≠ {form.totalQuestions})
              </span>
            )}
            {distributionOk && (
              <span className="ml-2 text-xs text-emerald-400">✓ Valid</span>
            )}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <FormField label="Total">
              <Input type="number" min={1} max={100}
                value={form.totalQuestions}
                onChange={(e) => setForm({ ...form, totalQuestions: parseInt(e.target.value) || 1 })}
              />
            </FormField>
            <FormField label="Easy">
              <Input type="number" min={0}
                value={form.easyCount}
                onChange={(e) => setForm({ ...form, easyCount: parseInt(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Medium">
              <Input type="number" min={0}
                value={form.mediumCount}
                onChange={(e) => setForm({ ...form, mediumCount: parseInt(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="Hard">
              <Input type="number" min={0}
                value={form.hardCount}
                onChange={(e) => setForm({ ...form, hardCount: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Pass % (0-100)">
            <Input type="number" min={0} max={100}
              value={form.passPercentage}
              onChange={(e) => setForm({ ...form, passPercentage: parseInt(e.target.value) || 0 })}
            />
          </FormField>
          <FormField label="Time limit (min, 0=unlimited)">
            <Input type="number" min={0}
              value={form.timeLimitMinutes}
              onChange={(e) => setForm({ ...form, timeLimitMinutes: parseInt(e.target.value) || 0 })}
            />
          </FormField>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:bg-white/5 text-sm transition"
          >
            Cancel
          </button>
          <button type="submit"
            disabled={isSaving || !form.name.trim() || !distributionOk}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition disabled:opacity-40"
          >
            {isSaving ? 'Saving…' : editing ? 'Save Changes' : 'Create Pool'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────
export const QuestionPoolsPage: React.FC = () => {
  const qc = useQueryClient();
  const [scopeFilter, setScope]     = useState<ScopeType | 'ALL'>('ALL');
  const [poolModal,  setPoolModal]  = useState(false);
  const [editing,    setEditing]    = useState<Pool | null>(null);
  const [delPool,    setDelPool]    = useState<Pool | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['pools'],
    queryFn: poolAPI.getAll,
  });
  const pools: Pool[] = data?.data?.data ?? [];

  const filtered = pools.filter((p) =>
    scopeFilter === 'ALL' || p.scopeType === scopeFilter
  );

  const deleteMut = useMutation({
    mutationFn: () => poolAPI.delete(delPool!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pools'] });
      toast.success('Pool deleted');
      setDelPool(null);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Failed to delete pool'),
  });

  const openCreate = () => { setEditing(null); setPoolModal(true); };
  const openEdit   = (p: Pool) => { setEditing(p); setPoolModal(true); };

  // Summary stats
  const domainPools = pools.filter((p) => p.scopeType === 'DOMAIN').length;
  const coursePools = pools.filter((p) => p.scopeType === 'COURSE').length;
  const topicPools  = pools.filter((p) => p.scopeType === 'TOPIC').length;
  const readyPools  = pools.filter((p) =>
    p.isActive &&
    (p.easyAvailable ?? 0) >= p.easyCount &&
    (p.mediumAvailable ?? 0) >= p.mediumCount &&
    (p.hardAvailable ?? 0) >= p.hardCount
  ).length;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList size={22} className="text-violet-400" />
            Question Pools
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage pools for Domain, Course and Topic level tests · Expand to add questions
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-medium transition shadow-lg shadow-violet-900/30"
        >
          <Plus size={16} /> New Pool
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Domain pools',  value: domainPools, color: 'text-violet-400', icon: <Globe size={18} className="text-violet-400" /> },
          { label: 'Course pools',  value: coursePools, color: 'text-emerald-400', icon: <BookOpen size={18} className="text-emerald-400" /> },
          { label: 'Topic pools',   value: topicPools,  color: 'text-blue-400',    icon: <FileText size={18} className="text-blue-400" /> },
          { label: 'Ready to test', value: readyPools,  color: 'text-emerald-400', icon: <CheckCircle size={18} className="text-emerald-400" /> },
        ].map(({ label, value, icon }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/3 border border-white/8">
            {icon}
            <div>
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/8">
          {(['ALL', 'DOMAIN', 'COURSE', 'TOPIC'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                scopeFilter === s
                  ? 'bg-violet-600 text-white shadow'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {s === 'ALL' ? 'All Scopes' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Pool list */}
      <div className="bg-surface/60 border border-white/8 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            message="No question pools yet"
            action={
              <button onClick={openCreate} className="text-xs text-violet-400 hover:underline">
                Create your first pool
              </button>
            }
          />
        ) : (
          filtered.map((p) => (
            <PoolRow key={p.id} pool={p} onEdit={openEdit} onDelete={setDelPool} />
          ))
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 mt-3">
          {filtered.length} pool{filtered.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* How it works */}
      <div className="mt-6 p-4 rounded-xl bg-blue-500/6 border border-blue-500/20 space-y-2">
        <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
          <HelpCircle size={13} /> How Question Pools Work
        </p>
        <ul className="text-xs text-slate-400 space-y-1 pl-1">
          <li>• Create a pool and set how many Easy / Medium / Hard questions to draw per test session</li>
          <li>• Add questions to the pool — MCQ (1 correct) or Multiple-correct (≥2 correct)</li>
          <li>• Link the pool to a Domain, Course or Topic using the <strong className="text-white">Link</strong> button</li>
          <li>• When a test is generated, questions are drawn randomly from the pool to match the distribution</li>
          <li>• A pool shows <span className="text-emerald-400">Ready</span> when it has enough active questions for every difficulty slot</li>
        </ul>
      </div>

      {/* Pool form modal */}
      <PoolFormModal
        open={poolModal}
        editing={editing}
        onClose={() => { setPoolModal(false); setEditing(null); }}
      />

      {/* Delete pool confirm */}
      <ConfirmDialog
        open={!!delPool}
        message={`Delete pool "${delPool?.name}"? All questions, answers, and scope mappings inside will be permanently removed.`}
        onConfirm={() => deleteMut.mutate()}
        onCancel={() => setDelPool(null)}
        loading={deleteMut.isPending}
      />
    </div>
  );
};
