import React, { useEffect, useRef } from 'react';
import { EditorState, Compartment, Prec } from '@codemirror/state';
import {
  EditorView, keymap, lineNumbers, highlightActiveLine,
  highlightActiveLineGutter, highlightSpecialChars, drawSelection,
  rectangularSelection, crosshairCursor, dropCursor,
} from '@codemirror/view';
import {
  defaultHighlightStyle, syntaxHighlighting, HighlightStyle, indentOnInput,
  bracketMatching, foldGutter, foldKeymap, indentUnit,
} from '@codemirror/language';
import {
  defaultKeymap, history, historyKeymap, indentWithTab,
} from '@codemirror/commands';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { java } from '@codemirror/lang-java';
import { Decoration } from '@codemirror/view';
import { StreamLanguage } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Brighter existing One Dark colors keep SQL legible on execution highlights.
const sqlDarkHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: '#e5c07b' },
  { tag: tags.variableName, color: '#abb2bf' },
  { tag: tags.string, color: '#98c379' },
  { tag: [tags.number, tags.standard(tags.variableName)], color: '#e5c07b' },
  { tag: tags.comment, color: '#abb2bf', fontStyle: 'italic' },
]);
const editorTheme = (dark: boolean, language: CodeLanguage) => dark
  ? [oneDark, ...(language === 'sql' ? [Prec.high(syntaxHighlighting(sqlDarkHighlight))] : [])] : [];

import type { CodeLanguage } from '../../types/animation';

// Small SQL mode for authored learning references, using the existing editor stack.
const sqlLanguage = StreamLanguage.define({
  startState: () => ({ comment: false }),
  token(stream, state) {
    if (state.comment) {
      if (stream.skipTo('*/')) { stream.match('*/'); state.comment = false; }
      else stream.skipToEnd();
      return 'comment';
    }
    if (stream.eatSpace()) return null;
    if (stream.match('--')) { stream.skipToEnd(); return 'comment'; }
    if (stream.match('/*')) { state.comment = true; return 'comment'; }
    if (stream.match(/'(?:[^']|'')*'/)) return 'string';
    if (stream.match(/\b\d+(?:\.\d+)?\b/)) return 'number';
    if (stream.match(/\b(?:SELECT|FROM|INNER|LEFT|RIGHT|FULL|OUTER|JOIN|ON|WHERE|AND|OR|NOT|NULL|IS|AS|ORDER|BY|GROUP|HAVING|LIMIT|DISTINCT|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|TABLE|ASC|DESC|IN|EXISTS|CASE|WHEN|THEN|ELSE|END|UNION)\b/i)) return 'keyword';
    if (stream.match(/\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE)\b/i)) return 'builtin';
    if (stream.match(/[a-zA-Z_][\w$]*/)) return 'variableName';
    stream.next();
    return null;
  },
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: CodeLanguage;
  activeLine?: number | null;
  activeLines?: number[];
  /** When true, renders the VS-Code-like dark theme; else a light theme. */
  dark?: boolean;
  readOnly?: boolean;
  /** Minimum editor height, e.g. '18rem'. */
  minHeight?: string;
}

function langExtension(language: CodeLanguage) {
  switch (language) {
    case 'java': return java();
    case 'python':     return python();
    case 'javascript': return javascript({ typescript: false });
    case 'typescript': return javascript({ typescript: true });
    case 'sql': return sqlLanguage;
    case 'cpp':
    case 'c':          return cpp();
    default:           return [];
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
  value, onChange, language, dark = true, readOnly = false, minHeight = '18rem', activeLine, activeLines,
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const langComp = useRef(new Compartment());
  const themeComp = useRef(new Compartment());
  const roComp = useRef(new Compartment());
  const executionComp = useRef(new Compartment());
  const activeLineRef = useRef(activeLine);
  activeLineRef.current = activeLines?.[0] ?? activeLine;
  // Keep the latest onChange without re-creating the editor.
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Create the editor once.
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: value,
      extensions: [
        EditorView.contentAttributes.of({ 'aria-label': 'Source code', tabindex: '0' }),
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
        themeComp.current.of(editorTheme(dark, language)),
        roComp.current.of(EditorState.readOnly.of(readOnly)),
        baseTheme,
        executionComp.current.of([]),
        // Instructional execution markers may scroll the editor, never the page.
        EditorView.scrollHandler.of((view, range) => {
          if (activeLineRef.current == null) return false;
          const block = view.lineBlockAt(range.head);
          const scroller = view.scrollDOM;
          if (block.top < scroller.scrollTop) scroller.scrollTop = Math.max(0, block.top - 8);
          else if (block.bottom > scroller.scrollTop + scroller.clientHeight)
            scroller.scrollTop = block.bottom - scroller.clientHeight + 8;
          return true;
        }),
        EditorView.theme({ '.cm-execution-line': { backgroundColor: 'rgba(50,136,245,0.18)', boxShadow: 'inset 3px 0 #3288f5' } }),
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
      effects: themeComp.current.reconfigure(editorTheme(dark, language)),
    });
  }, [dark, language]);

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

  // Follow execution inside the editor only, without scrolling the page.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const numbers = [...new Set(activeLines ?? (activeLine ? [activeLine] : []))]
      .filter(n => Number.isInteger(n) && n > 0 && n <= view.state.doc.lines).sort((a, b) => a - b);
    const lines = numbers.map(n => view.state.doc.line(n));
    const line = lines[0];
    view.dispatch({ effects: executionComp.current.reconfigure(
      lines.length ? EditorView.decorations.of(Decoration.set(lines.map(item =>
        Decoration.line({ class: 'cm-execution-line', attributes: { 'aria-current': 'true' } }).range(item.from),
      ))) : []
    ) });
    if (!line) return;
    // CodeMirror resolves estimated line heights and deferred off-screen layouts.
    // Its scroll effect targets the editor scroller, not page ancestors.
    view.dispatch({ effects: EditorView.scrollIntoView(line.from, { y: 'nearest', yMargin: 8 }) });
  }, [activeLine, activeLines, value, language]);

  return (
    <div
      ref={hostRef}
      style={{ minHeight }}
      className="w-full overflow-auto"
    />
  );
};
