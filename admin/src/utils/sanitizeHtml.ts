/**
 * Dependency-free allow-list HTML sanitizer (admin mirror of the student util).
 *
 * The moderation page renders student-authored stories with
 * `dangerouslySetInnerHTML`, so every string MUST pass through here first to
 * strip script injection, event handlers, and dangerous URLs (XSS defense).
 */

const ALLOWED_TAGS = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE',
  'UL', 'OL', 'LI', 'BLOCKQUOTE', 'CODE', 'PRE',
  'H1', 'H2', 'H3', 'H4', 'A', 'SPAN', 'DIV',
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  A: new Set(['href', 'title']),
};

const SAFE_URL = /^(https?:|mailto:|\/|#)/i;

const DANGEROUS_TAGS = new Set([
  'SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META',
  'FORM', 'INPUT', 'BUTTON', 'TEXTAREA', 'SVG', 'MATH',
]);

export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';
  const doc = new DOMParser().parseFromString(dirty, 'text/html');
  clean(doc.body);
  return doc.body.innerHTML;
}

function clean(root: Node): void {
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) continue;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      continue;
    }
    const el = node as Element;
    const tag = el.tagName.toUpperCase();
    if (DANGEROUS_TAGS.has(tag)) {
      el.remove();
      continue;
    }
    if (!ALLOWED_TAGS.has(tag)) {
      clean(el);
      unwrap(el);
      continue;
    }
    scrubAttributes(el, tag);
    clean(el);
  }
}

function scrubAttributes(el: Element, tag: string): void {
  const allowed = ALLOWED_ATTRS[tag] ?? new Set<string>();
  for (const attr of Array.from(el.attributes)) {
    const name = attr.name.toLowerCase();
    if (name.startsWith('on') || name === 'style' || !allowed.has(name)) {
      el.removeAttribute(attr.name);
      continue;
    }
    if (name === 'href' && !SAFE_URL.test(attr.value.trim())) {
      el.removeAttribute(attr.name);
    }
  }
  if (tag === 'A' && el.getAttribute('href')) {
    el.setAttribute('rel', 'noopener noreferrer nofollow');
    el.setAttribute('target', '_blank');
  }
}

function unwrap(el: Element): void {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
}

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

export function looksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value);
}

export function htmlToPlainText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
