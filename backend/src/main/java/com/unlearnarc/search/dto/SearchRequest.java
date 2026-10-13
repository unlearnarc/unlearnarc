package com.unlearnarc.search.dto;

import lombok.Data;
import org.springframework.data.domain.Sort;

import java.util.Set;

/**
 * Parsed, validated search parameters. Built from query params by the controller.
 *
 * <ul>
 *   <li>{@code query}     – free-text term. Blank = match all (browse mode).</li>
 *   <li>{@code types}     – which resource types to search. Empty handling done upstream (= all).</li>
 *   <li>{@code level}     – optional filter applied to COURSE / TOPIC / SKILL.</li>
 *   <li>{@code company}   – optional filter for INTERVIEW_EXPERIENCE / COMPANY.</li>
 *   <li>{@code courseId}  – optional filter for TOPIC.</li>
 *   <li>{@code status}    – optional filter for CONTEST (DRAFT/PUBLISHED/ARCHIVED).</li>
 *   <li>{@code verifiedOnly} – INTERVIEW_EXPERIENCE: restrict to verified posts (default true for students).</li>
 *   <li>{@code page}/{@code size} – per-type pagination.</li>
 *   <li>{@code sort}/{@code direction} – sort field + order (relevance is the default pseudo-field).</li>
 * </ul>
 */
@Data
public class SearchRequest {

    private String query;
    private Set<SearchType> types;

    private String level;
    private String company;
    private String courseId;
    private String status;
    private String difficulty;
    private boolean verifiedOnly = true;

    private int page = 0;
    private int size = 20;

    /** "relevance" (default), "name", "createdAt", etc. Interpreted per-searcher. */
    private String sort = "relevance";
    private Sort.Direction direction = Sort.Direction.DESC;

    public boolean hasQuery() {
        return query != null && !query.isBlank();
    }

    public String normalizedQuery() {
        return hasQuery() ? query.trim() : "";
    }

    public boolean sortByRelevance() {
        return sort == null || sort.isBlank() || "relevance".equalsIgnoreCase(sort);
    }
}
