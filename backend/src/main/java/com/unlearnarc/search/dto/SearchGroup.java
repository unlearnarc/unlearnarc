package com.unlearnarc.search.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Results for a single resource type, with its own pagination metadata so each
 * type can be paged independently on the frontend.
 */
@Data
@Builder
public class SearchGroup {

    /** Resource type this group represents (COURSE, TOPIC, ...). */
    private String type;

    /** Total number of matches for this type (across all pages). */
    private long totalHits;

    /** Zero-based page index returned. */
    private int page;

    /** Page size used. */
    private int size;

    /** Whether more pages exist for this type. */
    private boolean hasMore;

    /** The page of hits for this type. */
    private List<SearchResultItem> items;
}
