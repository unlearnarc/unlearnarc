import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, CheckCircle2, Circle, ListTodo, Flag } from 'lucide-react';
import clsx from 'clsx';
import { EmptyState } from '../ui/EmptyState';
import { LinkPicker, LinkBadge } from './LinkPicker';
import { useTodos } from './hooks';
import type { LinkRef, TodoPriority } from './types';

/* =============================================================================
   TodoPanel — a prioritised checklist that can link each task to a course/topic.

   The composer accepts text + priority + an optional link. Tasks render sorted
   (open first, by priority) with a strike-through when done. A footer summarises
   open count and offers "clear completed".
   ============================================================================= */

const PRIORITIES: { id: TodoPriority; key: string; dot: string }[] = [
  { id: 'HIGH', key: 'productivity.todos.high', dot: 'bg-danger' },
  { id: 'MEDIUM', key: 'productivity.todos.medium', dot: 'bg-warning' },
  { id: 'LOW', key: 'productivity.todos.low', dot: 'bg-text-muted' },
];

export const TodoPanel: React.FC = () => {
  const { t } = useTranslation();
  const { todos, openCount, add, toggle, remove, update, clearCompleted } = useTodos();

  const [text, setText] = useState('');
  const [priority, setPriority] = useState<TodoPriority>('MEDIUM');
  const [link, setLink] = useState<LinkRef | undefined>();

  const submit = () => {
    if (!text.trim()) return;
    add({ text: text.trim(), priority, link, dueAt: null });
    setText('');
    setPriority('MEDIUM');
    setLink(undefined);
  };

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="rounded-[12px] border border-border bg-surface p-3 space-y-2.5">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('productivity.todos.placeholder')}
          className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
        />
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex p-0.5 rounded-[8px] bg-surface-soft">
            {PRIORITIES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPriority(p.id)}
                className={clsx(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-xs font-medium transition',
                  priority === p.id ? 'bg-surface text-text-primary shadow-[var(--ua-shadow-card)]' : 'text-text-muted',
                )}
              >
                <span className={clsx('w-1.5 h-1.5 rounded-full', p.dot)} />
                {t(p.key)}
              </button>
            ))}
          </div>
          <LinkPicker value={link} onChange={setLink} className="ml-1" />
          <button
            onClick={submit}
            className="ml-auto inline-flex items-center gap-1.5 px-3 h-8 rounded-[8px] bg-primary-500 text-white text-sm font-medium hover:bg-primary-600 transition"
          >
            <Plus size={15} />
            {t('productivity.todos.add')}
          </button>
        </div>
      </div>

      {/* List */}
      {todos.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title={t('productivity.todos.emptyTitle')}
          description={t('productivity.todos.emptyDesc')}
        />
      ) : (
        <ul className="space-y-1.5">
          {todos.map((todo) => {
            const pr = PRIORITIES.find((p) => p.id === todo.priority)!;
            return (
              <li
                key={todo.id}
                className="group flex items-center gap-3 rounded-[10px] border border-border bg-surface px-3 py-2.5"
              >
                <button
                  onClick={() => toggle(todo.id)}
                  className={clsx('shrink-0 transition', todo.done ? 'text-success' : 'text-text-muted hover:text-primary-500')}
                  aria-label={t('productivity.todos.toggle')}
                >
                  {todo.done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div className="flex-1 min-w-0">
                  <input
                    value={todo.text}
                    onChange={(e) => update(todo.id, { text: e.target.value })}
                    className={clsx(
                      'w-full bg-transparent text-sm outline-none',
                      todo.done ? 'line-through text-text-muted' : 'text-text-primary',
                    )}
                  />
                  {todo.link && <LinkBadge link={todo.link} className="mt-1" />}
                </div>
                <span
                  className={clsx('inline-flex items-center gap-1 text-[11px] font-medium text-text-muted')}
                  title={t(pr.key)}
                >
                  <Flag size={11} className={clsx(pr.dot.replace('bg-', 'text-'))} />
                </span>
                <button
                  onClick={() => remove(todo.id)}
                  className="shrink-0 p-1 rounded text-text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition"
                  aria-label={t('productivity.todos.delete')}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Footer */}
      {todos.length > 0 && (
        <div className="flex items-center justify-between text-xs text-text-muted">
          <span>{t('productivity.todos.openCount', { count: openCount })}</span>
          {todos.some((todo) => todo.done) && (
            <button onClick={clearCompleted} className="font-medium hover:text-danger transition">
              {t('productivity.todos.clearCompleted')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
