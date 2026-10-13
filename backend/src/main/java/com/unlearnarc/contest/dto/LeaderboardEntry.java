package com.unlearnarc.contest.dto;

import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
public class LeaderboardEntry {
    private Integer rank;
    private String  userId;
    private String  userName;
    private Integer totalScore;
    private Integer solvedCount;
    private Integer penalty;
    private Instant lastAcceptedAt;
}
