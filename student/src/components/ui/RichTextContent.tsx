import React, { useMemo } from 'react';
import { sanitizeHtml, looksLikeHtml, plainTextToHtml } from '../../utils/sanitizeHtml';

interface RichTextContentProps {
  /** Untrusted stored story — may be HTML (new posts) or plain text (legacy). */
  html: string;
  className?: string;
}

/**
 * Renders a stored interview story safely. The value is always sanitized here,
 * even though the backend sanitizes on save, so a legacy/unsanitized row can
 * never inject script into the reading page.
 */
export const RichTextContent: React.FC<RichTextContentProps> = ({ html, className }) => {
  const safe = useMemo(() => {
    const asHtml = looksLikeHtml(html) ? html : plainTextToHtml(html);
    return sanitizeHtml(asHtml);
  }, [html]);

  return (
    <div
      className={`ua-rte-content ${className ?? ''}`}
      // Safe: `safe` has passed through the allow-list sanitizer above.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
};
