package com.unlearnarc.user.dto;

import lombok.Builder;
import lombok.Value;

/**
 * A single row of the global / region leaderboard.
 * {@code rank} is 1-based and assigned by the service at read time.
 */
@Value
@Builder
public class LeaderboardRow {
    int     rank;
    String  userId;
    String  name;
    String  region;
    long    points;
    String  profilePicture;
    boolean isCurrentUser;   // marks the requester's own row for UI highlight
}
