import React, { useMemo } from 'react';
import { sanitizeHtml, looksLikeHtml, plainTextToHtml } from '../../utils/sanitizeHtml';

interface RichTextContentProps {
  /** Untrusted stored story — may be HTML (new posts) or plain text (legacy). */
  html: string;
  className?: string;
}

/**
 * Safely renders a student-authored interview story in the moderation UI.
 * Always sanitized here (defense-in-depth) so an unsanitized legacy row can
 * never inject script into the admin page.
 */
export const RichTextContent: React.FC<RichTextContentProps> = ({ html, className }) => {
  const safe = useMemo(() => {
    const asHtml = looksLikeHtml(html) ? html : plainTextToHtml(html);
    return sanitizeHtml(asHtml);
  }, [html]);

  return (
    <div
      className={`ua-rte-admin ${className ?? ''}`}
      // Safe: `safe` has passed through the allow-list sanitizer above.
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
};
