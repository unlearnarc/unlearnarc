package com.unlearnarc.user.service;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.repository.UserRepository.PointsAgg;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Nightly self-heal: recomputes every user's cached {@code points} and {@code rank}
 * from the authoritative quiz (test_result) + contest (contest_participant) tables.
 *
 * Keeps the fast-read leaderboard cache honest even if a live {@code awardPoints}
 * call is ever missed or double-counted.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LeaderboardRecomputeJob {

    private final UserRepository userRepo;

    /** Runs nightly (default 03:15 server time). Override via app.leaderboard.recompute-cron. */
    @Scheduled(cron = "${app.leaderboard.recompute-cron:0 15 3 * * *}")
    @Transactional
    public void recompute() {
        long started = System.currentTimeMillis();

        // 1. Sum quiz + contest points per user from the source-of-truth tables.
        Map<String, Long> totals = new HashMap<>();
        for (PointsAgg a : userRepo.aggregateQuizPoints())    totals.merge(a.getUserId(), a.getTotal(), Long::sum);
        for (PointsAgg a : userRepo.aggregateContestPoints()) totals.merge(a.getUserId(), a.getTotal(), Long::sum);

        // 2. Write corrected totals back (self-heals any drift from the live cache).
        List<User> all = userRepo.findAll();
        for (User u : all) {
            long correct = totals.getOrDefault(u.getId(), 0L);
            if (!Objects.equals(u.getPoints(), correct)) {
                u.setPoints(correct);
            }
        }

        // 3. Recompute dense global rank (ties share a rank; next rank skips).
        all.sort(Comparator
                .comparingLong((User u) -> u.getPoints() == null ? 0 : u.getPoints()).reversed()
                .thenComparing(User::getName, Comparator.nullsLast(String::compareTo)));

        long rank = 0, seen = 0, prevPoints = Long.MIN_VALUE;
        for (User u : all) {
            long pts = u.getPoints() == null ? 0 : u.getPoints();
            seen++;
            if (pts != prevPoints) { rank = seen; prevPoints = pts; }
            u.setRank(pts > 0 ? rank : 0L);
        }
        userRepo.saveAll(all);

        log.info("[LEADERBOARD] recompute done: {} users in {} ms",
                all.size(), System.currentTimeMillis() - started);
    }
}
