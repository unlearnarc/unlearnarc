import { describe, expect, it } from 'vitest';
import { sanitizeHtml, plainTextToHtml, htmlToPlainText, looksLikeHtml } from './sanitizeHtml';

describe('rich text safety', () => {
  it('removes executable markup and handler attributes', () => {
    const safe = sanitizeHtml('<script>alert(1)</script><svg onload="alert(1)"></svg><p onclick="alert(1)" style="color:red">Hello <strong>world</strong></p>');
    expect(safe).toBe('<p>Hello <strong>world</strong></p>');
  });
  it('rejects encoded script URLs and unsafe image sources', () => {
    const safe = sanitizeHtml('<a href="jav&#97;script:alert(1)">link</a><img src="javascript:alert(1)" onerror="alert(1)">');
    expect(safe).toBe('<a>link</a>');
  });
  it('preserves lesson images and hardens safe links', () => {
    const safe = sanitizeHtml('<figure><img src="/lesson.png" alt="diagram"><figcaption>Example</figcaption></figure><a href="https://example.com">link</a>');
    expect(safe).toContain('src="/lesson.png"');
    expect(safe).toContain('rel="noopener noreferrer nofollow"');
    expect(safe).toContain('target="_blank"');
  });
  it('cleans nested unsupported wrappers and is idempotent', () => {
    const safe = sanitizeHtml('<custom><p>ok<img src="x" onerror="bad()"></p></custom>');
    expect(safe).toBe('<p>ok</p>');
    expect(sanitizeHtml(safe)).toBe(safe);
  });
  it('escapes legacy text without losing paragraph boundaries', () => {
    expect(plainTextToHtml('<script>\na&b\n\nnext')).toBe('<p>&lt;script&gt;<br>a&amp;b</p><p>next</p>');
    expect(htmlToPlainText('<p>Hello <b>world</b></p>')).toBe('Hello world');
    expect(looksLikeHtml('<p>hello</p>')).toBe(true);
    expect(looksLikeHtml('plain')).toBe(false);
    expect(sanitizeHtml('')).toBe('');
  });
});
