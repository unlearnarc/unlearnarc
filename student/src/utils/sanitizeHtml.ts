/**
 * Dependency-free allow-list HTML sanitizer.
 *
 * Rich-text interview stories are authored in the browser and rendered with
 * `dangerouslySetInnerHTML`, so every string MUST pass through here first to
 * strip script injection, event handlers, and dangerous URLs (XSS defense).
 *
 * This is the *client* layer. The backend sanitizes again on save
 * (defense-in-depth) — never trust one side alone.
 */

/** Tags we allow in a story. Everything else is unwrapped (kept text, dropped tag). */
const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'A', 'SPAN', 'DIV',
  // Notes (book-style lessons) add inline media + figures on top of the story subset.
  'IMG', 'FIGURE', 'FIGCAPTION', 'HR',
]);

/** Per-tag attribute allow-list. Anything not listed is removed. */
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
  IMG: new Set(['src', 'alt', 'title', 'width', 'height']),
};

/** URL schemes considered safe for href values. */
const SAFE_URL = /^(https?:|mailto:|\/|#)/i;
/** `src` may additionally be a data: image URI (inline-pasted images). */
const SAFE_IMG_SRC = /^(https?:|\/|data:image\/)/i;

const DANGEROUS_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SVG', 'MATH',
]);

/**
 * Sanitize an untrusted HTML string into a safe subset.
 * Returns an empty string for falsy / non-string input.
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}

/** Recursively walk + scrub a node's children in place. */
function clean(root: Node): void {
  // Snapshot children first — we mutate the tree while iterating.
  const children = Array.from(root.childNodes);

  for (const node of children) {
    if (node.nodeType === Node.TEXT_NODE) continue;

    if (node.nodeType === Node.COMMENT_NODE) {
      node.remove();
      continue;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      continue;
    }

    const el = node as Element;
    const tag = el.tagName.toUpperCase();

    // Hard-drop dangerous elements along with their contents.
    if (DANGEROUS_TAGS.has(tag)) {
      el.remove();
      continue;
    }

    if (!ALLOWED_TAGS.has(tag)) {
      // Disallowed-but-harmless tag: keep children, drop the wrapper.
      clean(el);
      unwrap(el);
      continue;
    }

    scrubAttributes(el, tag);
    clean(el);
  }
}

/** Strip every attribute except the per-tag allow-list; validate hrefs. */
function scrubAttributes(el: Element, tag: string): void {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();

  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    const value = attr.value;

    // Kill all inline event handlers and style/attribute-based script vectors.
    if (name.startsWith('on') || name === 'style' || !allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }

    if (name === 'href' && !SAFE_URL.test(value.trim())) {
      el.removeAttribute(attr.name);
    }

    if (name === 'src' && !SAFE_IMG_SRC.test(value.trim())) {
      el.removeAttribute(attr.name);
    }
  }

  // Harden external links against reverse-tabnabbing.
  if (tag === 'A' && el.getAttribute('href')) {
    el.setAttribute('rel', 'noopener noreferrer nofollow');
    el.setAttribute('target', '_blank');
  }

  // Drop an <img> whose src was stripped as unsafe — avoids a broken placeholder.
  if (tag === 'IMG' && !el.getAttribute('src')) {
    el.remove();
  }
}

/** Replace an element with its own children (keeps text, removes the tag). */
function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

/**
 * Convert legacy plain-text stories (newlines, no markup) into safe HTML so
 * old posts still render nicely in the new rich viewer.
 */
export function plainTextToHtml(text: string): string {
  if (!text) return '';
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** True when a string already contains HTML markup (vs. legacy plain text). */
export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

/** Strip all tags to a plain-text preview (for list truncation, search, etc.). */
export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
