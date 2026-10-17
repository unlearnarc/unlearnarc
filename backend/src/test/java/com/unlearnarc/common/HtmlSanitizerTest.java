package com.unlearnarc.common;

import org.jsoup.Jsoup;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTimeoutPreemptively;

class HtmlSanitizerTest {
    private final HtmlSanitizer sanitizer = new HtmlSanitizer();

    @Test void removesScriptsHandlersAndEncodedProtocols() {
        String safe = sanitizer.sanitize("<script>bad()</script><svg onload='bad()'></svg><p onclick='bad()'>Hello</p><a href='jav&#97;script:bad()'>link</a>");
        assertThat(safe).isEqualTo("<p>Hello</p><a>link</a>");
    }
    @Test void preservesRichTextAndSafeMedia() {
        String safe = sanitizer.sanitize("<figure><img src='/lesson.png' width='120' height='2px' alt='a &amp; b'><figcaption>Caption</figcaption></figure><a href='https://example.com'>link</a>");
        assertThat(safe).contains("width=\"120\"", "alt=\"a &amp; b\"", "<figcaption>Caption</figcaption>", "rel=\"noopener noreferrer nofollow\"").doesNotContain("height=");
        assertThat(sanitizer.sanitize(safe)).isEqualTo(safe);
    }
    @Test void dropsUnsafeImagesButKeepsInlineRasterImages() {
        String safe = sanitizer.sanitize("<img src='data:image/svg+xml;base64,abcd'><img src='javascript:bad()'><img><img src='data:image/png;base64,AAAA'>");
        assertThat(Jsoup.parseBodyFragment(safe).select("img")).hasSize(1);
        assertThat(safe).contains("data:image/png;base64,AAAA");
    }
    @Test void handlesNullBlankMalformedAndLargeInputs() {
        assertThat(sanitizer.sanitize(null)).isNull();
        assertThat(sanitizer.sanitize("  ")).isEmpty();
        assertTimeoutPreemptively(Duration.ofSeconds(3), () -> {
            String safe = sanitizer.sanitize("<p title='" + "x".repeat(100_000) + "<img src=x onerror=bad()>");
            assertThat(safe).doesNotContain("onerror");
        });
    }
}
