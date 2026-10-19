package com.unlearnarc.user;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.ProfileSharingService;
import com.unlearnarc.user.service.LeaderboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import jakarta.persistence.EntityNotFoundException;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class ProfileSharingServiceTest {
    private final UserRepository users = mock(UserRepository.class);
    private final ProfileSharingService sharing = new ProfileSharingService(users);
    private final LeaderboardService leaderboard = new LeaderboardService(users);
    private User user;

    @BeforeEach void setup() {
        user = User.builder().id("learner").name("Student").email("private@example.test")
                .points(100L).currentStreak(5).longestStreak(8)
                .lastActivityDate(LocalDate.now().minusDays(3)).build();
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(users.lockForContestScoring(user.getId())).thenReturn(Optional.of(user));
        when(users.countWithMorePoints(100L)).thenReturn(2L);
    }

    @Test void privateByDefaultAndRevocationRotatesLink() {
        assertNull(sharing.settings(user.getEmail()).token());
        String first = sharing.setEnabled(user.getEmail(), true).token();
        assertNotNull(first);
        assertEquals(first, sharing.setEnabled(user.getEmail(), true).token());
        assertNull(sharing.setEnabled(user.getEmail(), false).token());
        assertNotEquals(first, sharing.setEnabled(user.getEmail(), true).token());
    }

    @Test void publicProfileHasOnlySafeFieldsAndExpiredStreakIsZero() {
        when(users.findByProfileShareTokenAndIsActiveTrue("link")).thenReturn(Optional.of(user));
        var profile = sharing.publicProfile("link");
        assertEquals("Student", profile.name());
        assertEquals(3, profile.rank());
        assertEquals(0, profile.currentStreak());
        assertEquals(8, profile.longestStreak());
        assertEquals(5, profile.getClass().getRecordComponents().length);
    }

    @Test void invalidOrRevokedProfileIsNotFound() {
        when(users.findByProfileShareTokenAndIsActiveTrue("revoked")).thenReturn(Optional.empty());
        assertThrows(EntityNotFoundException.class, () -> sharing.publicProfile("revoked"));
    }

    @Test void rankChecksEstablishBaselineThenAcknowledgeChanges() {
        var baseline = leaderboard.checkRankChange(user.getId());
        assertFalse(baseline.changed());
        assertEquals(3, baseline.currentRank());
        when(users.countWithMorePoints(100L)).thenReturn(0L);
        var improved = leaderboard.checkRankChange(user.getId());
        assertTrue(improved.changed());
        assertEquals(3, improved.previousRank());
        assertEquals(1, improved.currentRank());
        assertFalse(leaderboard.checkRankChange(user.getId()).changed());
    }

    @Test void rankChangesIncludeEnteringAndLeavingLeaderboard() {
        user.setLastSeenRank(0);
        assertTrue(leaderboard.checkRankChange(user.getId()).changed());
        user.setPoints(0L);
        var lost = leaderboard.checkRankChange(user.getId());
        assertTrue(lost.changed());
        assertEquals(0, lost.currentRank());
    }
}
