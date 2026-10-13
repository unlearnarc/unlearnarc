package com.unlearnarc.common;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Server-side allow-list HTML sanitizer for user-authored rich text
 * (interview experience stories).
 *
 * <p>The browser already sanitizes before sending, but the backend must never
 * trust the client — a request can be forged with curl/Postman. This is the
 * authoritative sanitization layer: whatever it returns is what gets persisted
 * and later served to every reader.
 *
 * <p>Implementation note: this is intentionally a small, dependency-free
 * regex/allow-list pass rather than pulling in an HTML-parsing library, to keep
 * the backend footprint unchanged. It strips the high-risk vectors
 * (script/style/iframe blocks, inline event handlers, javascript: URLs) and
 * drops any tag not on the allow-list while keeping its text content.
 */
@Component
public class HtmlSanitizer {

    /** Tags permitted in a story. Case-insensitive match. */
    private static final Set<String> ALLOWED_TAGS = Set.of(
            "p", "br", "b", "strong", "i", "em", "u", "s", "strike",
            "ul", "ol", "li", "blockquote", "code", "pre",
            "h1", "h2", "h3", "h4", "a", "span", "div");

    /** Attributes permitted per tag. Anything else is removed. */
    private static final Map<String, Set<String>> ALLOWED_ATTRS = Map.of(
            "a", Set.of("href", "title"));

    private static final Pattern SAFE_URL =
            Pattern.compile("^(https?:|mailto:|/|#).*", Pattern.CASE_INSENSITIVE);

    // Remove whole dangerous element blocks (open..close) including content.
    private static final Pattern DANGEROUS_BLOCKS = Pattern.compile(
            "(?is)<\\s*(script|style|iframe|object|embed|form|textarea|svg|math)\\b[^>]*>.*?<\\s*/\\s*\\1\\s*>");

    // Remove self-closing / void dangerous or disallowed structural tags.
    private static final Pattern DANGEROUS_VOID = Pattern.compile(
            "(?is)<\\s*/?\\s*(link|meta|input|button|base|frame|frameset)\\b[^>]*>");

    // Matches any tag so we can filter it against the allow-list.
    private static final Pattern ANY_TAG = Pattern.compile("(?is)<\\s*(/?)\\s*([a-z0-9]+)((?:[^>\"']|\"[^\"]*\"|'[^']*')*)>");

    // Attribute parser: name="value" | name='value' | name=value | name
    private static final Pattern ATTR = Pattern.compile(
            "(?is)([a-z_:][a-z0-9_:.-]*)\\s*(?:=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+))?");

    /**
     * Sanitize an untrusted HTML string into the permitted subset.
     * Returns {@code null} for {@code null} input and "" for blank input.
     */
    public String sanitize(String dirty) {
        if (dirty == null) return null;
        if (dirty.isBlank()) return "";

        String html = dirty;
        html = DANGEROUS_BLOCKS.matcher(html).replaceAll("");
        html = DANGEROUS_VOID.matcher(html).replaceAll("");

        StringBuilder out = new StringBuilder(html.length());
        Matcher m = ANY_TAG.matcher(html);
        int last = 0;
        while (m.find()) {
            out.append(html, last, m.start());
            last = m.end();

            boolean closing = !m.group(1).isEmpty();
            String tag = m.group(2).toLowerCase();
            String rawAttrs = m.group(3) == null ? "" : m.group(3);

            if (!ALLOWED_TAGS.contains(tag)) {
                // Disallowed tag: drop the tag, keep the text that follows.
                continue;
            }
            if (closing) {
                out.append("</").append(tag).append('>');
            } else {
                out.append('<').append(tag).append(scrubAttributes(tag, rawAttrs)).append('>');
            }
        }
        out.append(html, last, html.length());
        return out.toString();
    }

    private String scrubAttributes(String tag, String rawAttrs) {
        Set<String> allowed = ALLOWED_ATTRS.getOrDefault(tag, Set.of());
        if (allowed.isEmpty() || rawAttrs.isBlank()) {
            return tag.equals("a") ? "" : "";
        }

        StringBuilder kept = new StringBuilder();
        boolean hasHref = false;
        Matcher am = ATTR.matcher(rawAttrs);
        while (am.find()) {
            String name = am.group(1).toLowerCase();
            String rawVal = am.group(2);
            String value = stripQuotes(rawVal);

            // Block event handlers, inline styles and non-allow-listed attrs.
            if (name.startsWith("on") || name.equals("style") || !allowed.contains(name)) {
                continue;
            }
            if (name.equals("href")) {
                if (value == null || !SAFE_URL.matcher(value.trim()).matches()) {
                    continue;
                }
                hasHref = true;
            }
            kept.append(' ').append(name);
            if (value != null) {
                kept.append("=\"").append(escapeAttr(value)).append('"');
            }
        }

        // Harden links against reverse-tabnabbing.
        if (tag.equals("a") && hasHref) {
            kept.append(" rel=\"noopener noreferrer nofollow\" target=\"_blank\"");
        }
        return kept.toString();
    }

    private static String stripQuotes(String v) {
        if (v == null) return null;
        if (v.length() >= 2
                && ((v.charAt(0) == '"' && v.charAt(v.length() - 1) == '"')
                 || (v.charAt(0) == '\'' && v.charAt(v.length() - 1) == '\''))) {
            return v.substring(1, v.length() - 1);
        }
        return v;
    }

    private static String escapeAttr(String v) {
        return v.replace("&", "&amp;").replace("\"", "&quot;").replace("<", "&lt;").replace(">", "&gt;");
    }
}
