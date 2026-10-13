package com.unlearnarc.user.service;

import com.unlearnarc.user.dto.LeaderboardRow;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Points-based leaderboard built on top of the cached {@code user.points} column.
 *
 * Hybrid model:
 *   - Reads are fast: ranked directly by the cached {@code user.points}.
 *   - Writes are live: {@link #awardPoints} atomically bumps the cache whenever a
 *     user earns points from a quiz (TestEngineService) or contest submission
 *     (ContestParticipationService).
 *   - A nightly {@link LeaderboardRecomputeJob} re-derives totals + ranks from the
 *     source-of-truth tables so any drift self-heals.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LeaderboardService {

    private static final int MAX_LIMIT = 100;

    private final UserRepository userRepo;

    /** Global top-N leaderboard. {@code currentUserId} may be null (unauthenticated). */
    @Transactional(readOnly = true)
    public List<LeaderboardRow> global(int limit, String currentUserId) {
        return toRows(userRepo.findGlobalLeaderboard(PageRequest.of(0, clamp(limit))), currentUserId);
    }

    /** Region-scoped leaderboard. */
    @Transactional(readOnly = true)
    public List<LeaderboardRow> region(String region, int limit, String currentUserId) {
        return toRows(userRepo.findRegionLeaderboard(region, PageRequest.of(0, clamp(limit))), currentUserId);
    }

    /** Distinct regions that currently have at least one scored user. */
    @Transactional(readOnly = true)
    public List<String> regions() {
        return userRepo.findActiveRegions();
    }

    /** The requester's own standing (live global rank + cached points). */
    @Transactional(readOnly = true)
    public LeaderboardRow myStanding(String userId) {
        User me = userRepo.findById(userId).orElse(null);
        if (me == null) return null;
        long points = me.getPoints() == null ? 0 : me.getPoints();
        int rank = points > 0 ? (int) (userRepo.countWithMorePoints(points) + 1) : 0;
        return LeaderboardRow.builder()
                .rank(rank)
                .userId(me.getId())
                .name(me.getName())
                .region(me.getRegion())
                .points(points)
                .profilePicture(me.getProfilePicture())
                .isCurrentUser(true)
                .build();
    }

    /**
     * HYBRID cache update — call synchronously whenever a user earns points.
     * Atomic increment avoids read-modify-write races under concurrency.
     */
    @Transactional
    public void awardPoints(String userId, long delta) {
        if (userId == null || delta == 0) return;
        int updated = userRepo.incrementPoints(userId, delta);
        if (updated == 0) {
            log.warn("[LEADERBOARD] awardPoints: user {} not found; delta {} dropped", userId, delta);
        } else {
            log.debug("[LEADERBOARD] awarded {} points to user {}", delta, userId);
        }
    }

    // ── helpers ────────────────────────────────────────────────────────────────
    private List<LeaderboardRow> toRows(List<User> users, String currentUserId) {
        List<LeaderboardRow> rows = new ArrayList<>(users.size());
        int rank = 1;
        for (User u : users) {
            rows.add(LeaderboardRow.builder()
                    .rank(rank++)
                    .userId(u.getId())
                    .name(u.getName())
                    .region(u.getRegion())
                    .points(u.getPoints() == null ? 0 : u.getPoints())
                    .profilePicture(u.getProfilePicture())
                    .isCurrentUser(u.getId().equals(currentUserId))
                    .build());
        }
        return rows;
    }

    private int clamp(int limit) {
        return Math.max(1, Math.min(limit, MAX_LIMIT));
    }
}
