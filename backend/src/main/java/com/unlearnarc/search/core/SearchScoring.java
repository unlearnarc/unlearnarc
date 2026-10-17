package com.unlearnarc.search.core;

import java.util.Locale;

/**
 * Lightweight, dependency-free relevance scoring shared by all searchers so
 * cross-type ranking is consistent. Scores are in a 0..100+ range.
 *
 * Heuristics (highest to lowest):
 *   - exact (case-insensitive) match        → 100
 *   - field starts with the query           → 80
 *   - whole-word match inside the field      → 65
 *   - substring match                        → 50 (minus a small positional penalty)
 *   - token overlap (multi-word queries)     → up to ~40
 *   - no match                               → 0
 *
 * Blank queries (browse mode) return a neutral baseline so ordering falls back
 * to the explicit sort field.
 */
public final class SearchScoring {

    private SearchScoring() {}

    public static final double NO_MATCH = 0d;
    public static final double BROWSE_BASELINE = 1d;

    /** Score a single field against the query. Returns {@link #NO_MATCH} if absent. */
    public static double scoreField(String field, String query) {
        if (field == null || field.isBlank()) return NO_MATCH;
        if (query == null || query.isBlank()) return BROWSE_BASELINE;

        String f = field.toLowerCase(Locale.ROOT);
        String q = query.trim().toLowerCase(Locale.ROOT);

        if (f.equals(q)) return 100d;
        if (f.startsWith(q)) return 80d;

        int idx = f.indexOf(q);
        if (idx >= 0) {
            boolean wordBoundary = idx == 0 || !Character.isLetterOrDigit(f.charAt(idx - 1));
            double base = wordBoundary ? 65d : 50d;
            // earlier matches rank slightly higher
            double positionPenalty = Math.min(10d, idx * 0.2d);
            return base - positionPenalty;
        }

        // multi-word token overlap
        String[] qTokens = q.split("\\s+");
        if (qTokens.length > 1) {
            int hits = 0;
            for (String t : qTokens) {
                if (!t.isBlank() && f.contains(t)) hits++;
            }
            if (hits > 0) {
                return 40d * ((double) hits / qTokens.length);
            }
        }
        return NO_MATCH;
    }

    /**
     * Score an item across several weighted fields and return the best weighted
     * contribution. {@code fieldsAndWeights} is a flat list: field0, weight0, field1, weight1...
     */
    public static double scoreBest(String query, Object... fieldsAndWeights) {
        double best = NO_MATCH;
        boolean browse = query == null || query.isBlank();
        for (int i = 0; i + 1 < fieldsAndWeights.length; i += 2) {
            String field = (String) fieldsAndWeights[i];
            double weight = ((Number) fieldsAndWeights[i + 1]).doubleValue();
            double s = scoreField(field, query) * weight;
            if (s > best) best = s;
        }
        if (browse && best == NO_MATCH) return BROWSE_BASELINE;
        return best;
    }
}
