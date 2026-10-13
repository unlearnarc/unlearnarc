import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, highlightSpecialChars, drawSelection,
  rectangularSelection, crosshairCursor, dropCursor,
} from '@codemirror/view';
import {
  defaultHighlightStyle, syntaxHighlighting, indentOnInput,
  bracketMatching, foldGutter, foldKeymap, indentUnit,
} from '@codemirror/language';
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
} from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import type { Language } from '../../sandbox/types';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  /** When true, renders the VS-Code-like dark theme; else a light theme. */
  dark?: boolean;
  readOnly?: boolean;
  /** Minimum editor height, e.g. '18rem'. */
  minHeight?: string;
}

function langExtension(language: Language) {
  switch (language) {
    case 'python':     return python();
    case 'javascript': return javascript({ typescript: false });
    case 'cpp':
    case 'c':          return cpp();
    default:           return python();
  }
}

// VS-Code-ish sizing/typography applied on top of the chosen theme.
const baseTheme = EditorView.theme({
  '&': { height: '100%', fontSize: '13px' },
  '.cm-scroller': {
    fontFamily:
      "'JetBrains Mono','Fira Code',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
    lineHeight: '1.6',
  },
  '.cm-gutters': { borderRight: '1px solid rgba(128,128,128,0.15)' },
  '.cm-content': { padding: '12px 0' },
  '&.cm-focused': { outline: 'none' },
});

/**
 * CodeMirror 6 editor giving a VS-Code-style experience: syntax highlighting,
 * line numbers, active-line highlight, bracket matching, code folding, multi-
 * cursor, undo/redo history and Tab-to-indent. The language and theme are held
 * in Compartments so they can be reconfigured without rebuilding the editor.
 */
export const CodeEditor: React.FC<CodeEditorProps> = ({
  value, onChange, language, dark = true, readOnly = false, minHeight = '18rem',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const themeComp = useRef(new Compartment());
  const roComp = useRef(new Compartment());
  // Keep the latest onChange without re-creating the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        indentUnit.of('    '),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
        ]),
        langComp.current.of(langExtension(language)),
        themeComp.current.of(dark ? oneDark : []),
        roComp.current.of(EditorState.readOnly.of(readOnly)),
        baseTheme,
        EditorView.updateListener.of(u => {
          if (u.docChanged) onChangeRef.current(u.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reconfigure language without rebuilding.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: langComp.current.reconfigure(langExtension(language)),
    });
  }, [language]);

  // Reconfigure theme.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: themeComp.current.reconfigure(dark ? oneDark : []),
    });
  }, [dark]);

  // Reconfigure read-only.
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: roComp.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  // Sync external value changes (e.g. starter-code reset) without clobbering
  // the cursor while the user is typing.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  return (
    <div
      ref={hostRef}
      style={{ minHeight }}
      className="w-full overflow-auto"
    />
  );
};
