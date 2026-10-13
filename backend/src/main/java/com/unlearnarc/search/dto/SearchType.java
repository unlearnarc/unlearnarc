package com.unlearnarc.search.dto;

import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.Set;

/**
 * The resource types the global search engine can look across.
 *
 * COMPANY is a virtual type derived from distinct {@code interview_experience.company}
 * values (there is no standalone Company table).
 */
public enum SearchType {
    COURSE,
    TOPIC,
    SKILL,
    DOMAIN,
    INTERVIEW_EXPERIENCE,
    CONTEST,
    CONTEST_PROBLEM,
    ALGORITHM,
    COMPANY;

    /** Lenient parser: accepts case-insensitive names and a few common aliases. */
    public static SearchType from(String raw) {
        if (raw == null) return null;
        String v = raw.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        return switch (v) {
            case "COURSE", "COURSES" -> COURSE;
            case "TOPIC", "TOPICS" -> TOPIC;
            case "SKILL", "SKILLS" -> SKILL;
            case "DOMAIN", "DOMAINS" -> DOMAIN;
            case "INTERVIEW", "INTERVIEWS", "INTERVIEW_EXPERIENCE",
                 "INTERVIEW_EXPERIENCES", "EXPERIENCE", "EXPERIENCES" -> INTERVIEW_EXPERIENCE;
            case "CONTEST", "CONTESTS" -> CONTEST;
            case "CONTEST_PROBLEM", "CONTEST_PROBLEMS", "PROBLEM", "PROBLEMS",
                 "CODING_PROBLEM", "CODING_PROBLEMS" -> CONTEST_PROBLEM;
            case "ALGORITHM", "ALGORITHMS", "ALGO", "ALGOS", "VISUALIZER", "VISUALIZERS" -> ALGORITHM;
            case "COMPANY", "COMPANIES" -> COMPANY;
            default -> throw new IllegalArgumentException("Unknown search type: " + raw);
        };
    }

    /** Parse a comma-separated {@code types} param into a de-duplicated set (null/blank = all). */
    public static Set<SearchType> parseList(String csv) {
        if (csv == null || csv.isBlank()) {
            return new LinkedHashSet<>(Arrays.asList(values()));
        }
        Set<SearchType> out = new LinkedHashSet<>();
        for (String part : csv.split(",")) {
            if (!part.isBlank()) out.add(from(part));
        }
        return out.isEmpty() ? new LinkedHashSet<>(Arrays.asList(values())) : out;
    }
}
