package com.unlearnarc.search.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Top-level payload for a global search request. Results are grouped by resource
 * type so clients can render per-section lists ("Courses", "Topics"...), while
 * {@code flat} offers a single pre-ranked stream for an "All results" view.
 */
@Data
@Builder
public class GlobalSearchResponse {

    /** The query that produced these results (echoed back). */
    private String query;

    /** Total matches across every searched type. */
    private long totalHits;

    /** How long the search took, in milliseconds. */
    private long tookMs;

    /** Per-type grouped results (only types that were searched appear). */
    private List<SearchGroup> groups;

    /**
     * A single relevance-ranked list merged across all types, already paged
     * ({@code flatPage}/{@code flatSize}). Useful for a unified "All" tab.
     */
    private List<SearchResultItem> flat;
}
