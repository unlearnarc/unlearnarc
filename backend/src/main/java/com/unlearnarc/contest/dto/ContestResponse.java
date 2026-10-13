package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.Contest.ContestStatus;
import com.unlearnarc.contest.entity.Contest.Visibility;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class ContestResponse {
    private String        id;
    private String        title;
    private String        slug;
    private String        description;
    private ContestStatus status;
    private Visibility    visibility;
    private Instant       startTime;
    private Instant       endTime;
    private Integer       durationMinutes;
    private String        allowedLanguages;
    private Integer       wrongSubmissionPenalty;
    private String        createdBy;
    private Instant       createdAt;

    // live stats
    private Long          problemCount;
    private Long          participantCount;

    /** DRAFT | PUBLISHED | ARCHIVED combined with time window: UPCOMING | RUNNING | ENDED. */
    private String        phase;
}
