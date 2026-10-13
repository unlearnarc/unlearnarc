package com.unlearnarc.search.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

/**
 * A single, type-agnostic search hit. Every searchable resource is projected
 * into this common shape so the frontend can render a unified result list
 * regardless of the underlying entity.
 */
@Data
@Builder
public class SearchResultItem {

    /** Resource type: COURSE, TOPIC, SKILL, DOMAIN, INTERVIEW_EXPERIENCE, CONTEST, COMPANY. */
    private String type;

    /** Primary id of the underlying entity. */
    private String id;

    /** Human-readable title (course name, topic name, contest title, company name...). */
    private String title;

    /** Optional secondary line (e.g. role for interview, level for a course). */
    private String subtitle;

    /** Optional longer snippet (e.g. truncated description / experience). */
    private String snippet;

    /** Relevance score — higher = better match. Used for cross-type ranking. */
    private double score;

    /** Type-specific extra fields the frontend may want (level, courseId, status...). */
    private Map<String, Object> meta;
}
