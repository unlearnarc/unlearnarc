import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered,
  Quote, Code2, Heading2, Heading3, Link2, Undo2, Redo2, Eraser,
  Image as ImageIcon, Minus,
} from 'lucide-react';
import { sanitizeHtml, looksLikeHtml, plainTextToHtml } from '../../utils/sanitizeHtml';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  onPlainTextChange?: (len: number) => void;
}

interface ToolButton {
  icon: React.ElementType;
  label: string;
  command: string;
  arg?: string;
  block?: string;
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
 * contentEditable rich-text editor for authoring book-style notes. Adds image
 * insertion (URL or pasted/dropped file → inline data URI) and a horizontal
 * rule on top of the standard formatting set. Everything that leaves the editor
 * is sanitized, so the consumer always gets XSS-safe markup.
 */
export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write the lesson…',
  minHeight = 320,
  onPlainTextChange,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Record<string, boolean>>({});
  const [focused, setFocused] = useState(false);

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
        /* ignore unknown commands */
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

  const insertHtml = (html: string) => {
    editorRef.current?.focus();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  const addLink = () => {
    editorRef.current?.focus();
    const url = window.prompt('Link URL (https://…)');
    if (!url) return;
    document.execCommand('createLink', false, url);
    emit();
  };

  const addImageByUrl = () => {
    const url = window.prompt('Image URL (https://… or /path.png)');
    if (!url) return;
    const safeUrl = url.replace(/"/g, '&quot;');
    insertHtml(`<img src="${safeUrl}" alt="" />`);
  };

  const addRule = () => insertHtml('<hr />');

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const insertImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const dataUrl = await readFileAsDataUrl(file);
    insertHtml(`<img src="${dataUrl}" alt="${file.name.replace(/"/g, '')}" />`);
  };

  const pickImageFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) void insertImageFile(f);
    };
    input.click();
  };

  // Paste: insert images as data URIs, everything else as plain text.
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((it) => it.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (file) await insertImageFile(file);
      return;
    }
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    emit();
  };

  const handleDrop = async (e: React.DragEvent) => {
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      e.preventDefault();
      await insertImageFile(file);
    }
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
      className={`rounded-lg border bg-white/5 transition ${
        focused ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-white/10'
      }`}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-white/10">
        {TOOLBAR.map((item, i) =>
          item === 'divider' ? (
            <span key={`d${i}`} className="w-px h-5 bg-white/10 mx-1" />
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
                  ? 'bg-violet-500/20 text-violet-300'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <item.icon size={15} />
            </button>
          ),
        )}
        <span className="w-px h-5 bg-white/10 mx-1" />
        <button type="button" title="Insert link" onMouseDown={(e) => e.preventDefault()}
          onClick={addLink}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition">
          <Link2 size={15} />
        </button>
        <button type="button" title="Insert image from URL" onMouseDown={(e) => e.preventDefault()}
          onClick={addImageByUrl}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition">
          <ImageIcon size={15} />
        </button>
        <button type="button" title="Upload image" onMouseDown={(e) => e.preventDefault()}
          onClick={pickImageFile}
          className="px-1.5 py-1.5 rounded-md text-[10px] font-semibold text-slate-400 hover:text-white hover:bg-white/10 transition">
          Upload
        </button>
        <button type="button" title="Horizontal rule" onMouseDown={(e) => e.preventDefault()}
          onClick={addRule}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition">
          <Minus size={15} />
        </button>
        <button type="button" title="Clear formatting" onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            editorRef.current?.focus();
            document.execCommand('removeFormat');
            document.execCommand('formatBlock', false, 'P');
            refreshActiveState();
            emit();
          }}
          className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition">
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
        onDrop={handleDrop}
        onKeyDown={handleKeyDown}
        onKeyUp={refreshActiveState}
        onMouseUp={refreshActiveState}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); emit(); }}
        className="ua-rte-admin px-4 py-3 text-sm text-slate-200 leading-relaxed outline-none overflow-y-auto"
        style={{ minHeight }}
        suppressContentEditableWarning
      />
    </div>
  );
};
