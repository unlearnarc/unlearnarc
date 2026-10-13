import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code2, Heading2, Heading3, Link2, Undo2, Redo2, Eraser,
} from 'lucide-react';
import { sanitizeHtml, looksLikeHtml, plainTextToHtml } from '../../utils/sanitizeHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** Characters of plain text — reported back for validation / counters. */
  onPlainTextChange?: (len: number) => void;
}

interface ToolButton {
  icon: React.ElementType;
  label: string;
  command: string;
  arg?: string;
  block?: string; // for formatBlock toggles
}

const TOOLBAR: (ToolButton | 'divider')[] = [
  { icon: Bold,          label: 'Bold (Ctrl+B)',      command: 'bold' },
  { icon: Italic,        label: 'Italic (Ctrl+I)',    command: 'italic' },
  { icon: Underline,     label: 'Underline (Ctrl+U)', command: 'underline' },
  { icon: Strikethrough, label: 'Strikethrough',      command: 'strikeThrough' },
  'divider',
  { icon: Heading2,      label: 'Heading',     command: 'formatBlock', block: 'H2' },
  { icon: Heading3,      label: 'Subheading',  command: 'formatBlock', block: 'H3' },
  { icon: Quote,         label: 'Quote',       command: 'formatBlock', block: 'BLOCKQUOTE' },
  { icon: Code2,         label: 'Code block',  command: 'formatBlock', block: 'PRE' },
  'divider',
  { icon: List,          label: 'Bulleted list', command: 'insertUnorderedList' },
  { icon: ListOrdered,   label: 'Numbered list', command: 'insertOrderedList' },
  'divider',
  { icon: Undo2,         label: 'Undo', command: 'undo' },
  { icon: Redo2,         label: 'Redo', command: 'redo' },
];

/**
 * A lightweight, dependency-free rich-text editor built on `contentEditable`.
 * Every value that leaves the editor is run through `sanitizeHtml`, so the
 * consumer always receives XSS-safe markup.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write your story…',
  minHeight = 220,
  onPlainTextChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState(false);

  // Seed the editor once (and when an external value replaces it, e.g. edit mode).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const incoming = looksLikeHtml(value) ? value : plainTextToHtml(value);
    const safe = sanitizeHtml(incoming);
    if (el.innerHTML !== safe) el.innerHTML = safe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const safe = sanitizeHtml(el.innerHTML);
    onChange(safe);
    onPlainTextChange?.((el.textContent ?? '').trim().length);
  }, [onChange, onPlainTextChange]);

  const refreshActiveState = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const item of TOOLBAR) {
      if (item === 'divider') continue;
      try {
        next[item.command + (item.block ?? '')] = item.block
          ? document.queryCommandValue('formatBlock').toUpperCase() === item.block
          : document.queryCommandState(item.command);
      } catch {
        /* queryCommandState throws in some browsers for unknown commands */
      }
    }
    setActive(next);
  }, []);

  const exec = (item: ToolButton) => {
    editorRef.current?.focus();
    if (item.command === 'formatBlock') {
      const isActive =
        document.queryCommandValue('formatBlock').toUpperCase() === item.block;
      document.execCommand('formatBlock', false, isActive ? 'P' : item.block!);
    } else {
      document.execCommand(item.command, false, item.arg);
    }
    refreshActiveState();
    emit();
  };

  const addLink = () => {
    editorRef.current?.focus();
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    document.execCommand('createLink', false, url);
    emit();
  };

  const clearFormatting = () => {
    editorRef.current?.focus();
    document.execCommand('removeFormat');
    document.execCommand('formatBlock', false, 'P');
    refreshActiveState();
    emit();
  };

  // Force plain-text paste so users can't smuggle in markup/styles.
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emit();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!(e.metaKey || e.ctrlKey)) return;
    const map: Record<string, string> = { b: 'bold', i: 'italic', u: 'underline' };
    const cmd = map[e.key.toLowerCase()];
    if (cmd) {
      e.preventDefault();
      document.execCommand(cmd);
      refreshActiveState();
      emit();
    }
  };

  return (
    <div
      className={`rounded-[10px] border bg-bg-soft transition ${
        focused ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-border'
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border">
        {TOOLBAR.map((item, i) =>
          item === 'divider' ? (
            <span key={`d${i}`} className="w-px h-5 bg-border mx-1" />
          ) : (
            <button
              key={item.command + (item.block ?? '')}
              type="button"
              title={item.label}
              aria-label={item.label}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => exec(item)}
              className={`p-1.5 rounded-md transition ${
                active[item.command + (item.block ?? '')]
                  ? 'bg-primary-50 text-primary-600'
                  : 'text-text-muted hover:text-text-primary hover:bg-surface-soft'
              }`}
            >
              <item.icon size={15} />
            </button>
          ),
        )}
        <span className="w-px h-5 bg-border mx-1" />
        <button
          type="button"
          title="Insert link"
          aria-label="Insert link"
          onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-soft transition"
        >
          <Link2 size={15} />
        </button>
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          onMouseDown={(e) => e.preventDefault()}
          onClick={clearFormatting}
          className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-surface-soft transition"
        >
          <Eraser size={15} />
        </button>
      </div>

      {/* Editable surface */}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={emit}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onKeyUp={refreshActiveState}
        onMouseUp={refreshActiveState}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); emit(); }}
        className="ua-rte-content px-4 py-3 text-sm text-text-primary leading-relaxed outline-none overflow-y-auto"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
};
