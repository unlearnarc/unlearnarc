package com.unlearnarc.user;

import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.ProfileSharingService;
import com.unlearnarc.user.service.LeaderboardService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
@ActiveProfiles("test")
@Import({ProfileSharingService.class, LeaderboardService.class})
class ProfileSharingPersistenceTest {
    @Autowired UserRepository users;
    @Autowired ProfileSharingService sharing;
    @Autowired LeaderboardService leaderboard;

    @Test void sharingAndRankAcknowledgementsPersist() {
        User student = users.saveAndFlush(User.builder().name("Student").email("student@example.test").points(100L).build());
        users.saveAndFlush(User.builder().name("Other").email("other@example.test").points(200L).build());
        String token = sharing.setEnabled(student.getEmail(), true).token();
        users.flush();
        assertEquals(2, sharing.publicProfile(token).rank());
        assertFalse(leaderboard.checkRankChange(student.getId()).changed());
        users.incrementPoints(student.getId(), 200);
        var change = leaderboard.checkRankChange(student.getId());
        assertTrue(change.changed());
        assertEquals(2, change.previousRank());
        assertEquals(1, change.currentRank());
        assertFalse(leaderboard.checkRankChange(student.getId()).changed());
        sharing.setEnabled(student.getEmail(), false);
        users.flush();
        assertThrows(EntityNotFoundException.class, () -> sharing.publicProfile(token));
    }
}
