package com.unlearnarc.contest.service;

import org.springframework.stereotype.Component;

/**
 * Normalises and compares the output the client reported against the expected
 * output stored server-side. This is the trust boundary: the client ran the
 * code, but the SERVER decides whether it was correct.
 *
 * Normalised compare (default):
 *   - converts CRLF/CR to LF
 *   - trims trailing whitespace on each line
 *   - strips trailing blank lines / trailing newline
 *
 * Strict compare: byte-for-byte equality.
 */
@Component
public class OutputValidator {

    public boolean matches(String expected, String produced, boolean strict) {
        if (expected == null) expected = "";
        if (produced == null) produced = "";
        if (strict) {
            return expected.equals(produced);
        }
        return normalize(expected).equals(normalize(produced));
    }

    private String normalize(String s) {
        String unified = s.replace("\r\n", "\n").replace("\r", "\n");
        String[] lines = unified.split("\n", -1);
        StringBuilder sb = new StringBuilder();
        for (String line : lines) {
            sb.append(stripTrailing(line)).append('\n');
        }
        // strip trailing blank lines
        int end = sb.length();
        while (end > 0 && sb.charAt(end - 1) == '\n') {
            end--;
        }
        return sb.substring(0, end);
    }

    private String stripTrailing(String line) {
        int end = line.length();
        while (end > 0 && Character.isWhitespace(line.charAt(end - 1))) {
            end--;
        }
        return line.substring(0, end);
    }
}
