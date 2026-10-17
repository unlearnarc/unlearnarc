package com.unlearnarc.contest.dto;

import java.util.Set;

/** Persisted submission-derived progress; completion means all active problems accepted. */
public record ContestProgressResponse(String contestId, int totalScore, int problemCount,
                                      Set<String> solvedProblemIds, boolean completed) {}
