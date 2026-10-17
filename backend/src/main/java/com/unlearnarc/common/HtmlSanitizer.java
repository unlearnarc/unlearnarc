package com.unlearnarc.common;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.safety.Cleaner;
import org.jsoup.safety.Safelist;
import org.springframework.stereotype.Component;

import java.util.Locale;

/** Authoritative server-side rich-text allow-list, parsed as HTML rather than regex. */
@Component
public class HtmlSanitizer {
    private static final Safelist POLICY = new Safelist()
            .addTags("p", "br", "b", "strong", "i", "em", "u", "s", "strike",
                    "ul", "ol", "li", "blockquote", "code", "pre", "h1", "h2", "h3", "h4",
                    "a", "span", "div", "img", "figure", "figcaption", "hr")
            .addAttributes("a", "href", "title")
            .addAttributes("img", "src", "alt", "title", "width", "height");

    public String sanitize(String dirty) {
        if (dirty == null) return null;
        if (dirty.isBlank()) return "";
        Document parsed = Jsoup.parseBodyFragment(dirty);
        // Remove active contents as well as their wrapper elements.
        parsed.select("script,style,iframe,object,embed,form,textarea,svg,math").remove();
        Document safe = new Cleaner(POLICY).clean(parsed);
        safe.outputSettings().prettyPrint(false);
        for (Element link : safe.select("a[href]")) {
            if (safeUrl(link.attr("href"), false)) {
                link.attr("rel", "noopener noreferrer nofollow").attr("target", "_blank");
            } else {
                link.removeAttr("href");
            }
        }
        for (Element image : safe.select("img")) {
            if (!safeUrl(image.attr("src"), true)) {
                image.remove();
                continue;
            }
            for (String dimension : new String[]{"width", "height"}) {
                if (!image.attr(dimension).matches("[0-9]{1,5}")) image.removeAttr(dimension);
            }
        }
        return safe.body().html();
    }

    private static boolean safeUrl(String value, boolean image) {
        String url = value.trim().toLowerCase(Locale.ROOT);
        if (url.isEmpty() || url.codePoints().anyMatch(Character::isISOControl)) return false;
        if (url.startsWith("https:") || url.startsWith("http:") || url.startsWith("/")) return true;
        if (!image) return url.startsWith("mailto:") || url.startsWith("#");
        // Only raster images: data:image/svg+xml can contain active content.
        return url.startsWith("data:image/png;base64,") || url.startsWith("data:image/jpeg;base64,")
                || url.startsWith("data:image/gif;base64,") || url.startsWith("data:image/webp;base64,")
                || url.startsWith("data:image/avif;base64,");
    }
}
