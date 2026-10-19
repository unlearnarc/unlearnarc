package com.unlearnarc.user.service;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfileSharingService {
    private final UserRepository users;

    @Transactional(readOnly = true)
    public Sharing settings(String email) {
        return new Sharing(owner(email).getProfileShareToken());
    }

    @Transactional
    public Sharing setEnabled(String email, boolean enabled) {
        User owner = owner(email);
        User user = users.lockForContestScoring(owner.getId()).orElseThrow();
        if (!enabled) user.setProfileShareToken(null);
        else if (user.getProfileShareToken() == null) user.setProfileShareToken(UUID.randomUUID().toString());
        users.save(user);
        return new Sharing(user.getProfileShareToken());
    }

    @Transactional(readOnly = true)
    public PublicProfile publicProfile(String token) {
        User user = users.findByProfileShareTokenAndIsActiveTrue(token)
                .orElseThrow(() -> new EntityNotFoundException("Profile unavailable"));
        long points = user.getPoints() == null ? 0 : user.getPoints();
        int rank = points > 0 ? (int) (users.countWithMorePoints(points) + 1) : 0;
        LocalDate last = user.getLastActivityDate();
        long gap = last == null ? -1 : ChronoUnit.DAYS.between(last, LocalDate.now());
        int current = gap >= 0 && gap <= 1 && user.getCurrentStreak() != null ? user.getCurrentStreak() : 0;
        // Explicit allowlist: never serialize the account entity or private profile DTO.
        return new PublicProfile(user.getName(), points, rank, current,
                user.getLongestStreak() == null ? 0 : user.getLongestStreak());
    }

    private User owner(String email) {
        return users.findByEmail(email).filter(u -> Boolean.TRUE.equals(u.getIsActive()))
                .orElseThrow(() -> new EntityNotFoundException("User unavailable"));
    }

    public record Sharing(String token) {}
    public record PublicProfile(String name, long points, int rank, int currentStreak, int longestStreak) {}
}
