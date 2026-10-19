package com.unlearnarc.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "`user`")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false, columnDefinition = "CHAR(100)")
    private String name;

    @Column(name = "email", nullable = false, unique = true, columnDefinition = "CHAR(150)")
    private String email;

    @Column(name = "region", columnDefinition = "CHAR(100)")
    private String region;

    @Column(name = "`rank`")
    @Builder.Default
    private Long rank = 0L;

    @Column(name = "points")
    @Builder.Default
    private Long points = 0L;

    // ── Daily activity streak ────────────────────────────────────────────────
    /** Consecutive-day streak length, as of lastActivityDate. */
    @Column(name = "current_streak", nullable = false)
    @Builder.Default
    private Integer currentStreak = 0;

    /** All-time best streak this user has ever reached. */
    @Column(name = "longest_streak", nullable = false)
    @Builder.Default
    private Integer longestStreak = 0;

    /** The last calendar day (server date) the user was active. Null = never. */
    @Column(name = "last_activity_date")
    private LocalDate lastActivityDate;

    // ── Coach Buddy (mascot companion) preferences ───────────────────────────
    /** Selected buddy id (e.g. 'luna', 'max', 'mochi', 'byte'). */
    @Column(name = "mascot_character", nullable = false, columnDefinition = "VARCHAR(40)")
    @Builder.Default
    private String mascotCharacter = "luna";

    /** Personality tone: 'friend' (supportive) or 'companion' (warm). */
    @Column(name = "mascot_vibe", nullable = false, columnDefinition = "VARCHAR(20)")
    @Builder.Default
    private String mascotVibe = "friend";

    /** Whether the buddy's reactions are silenced. */
    @Column(name = "mascot_muted", nullable = false)
    @Builder.Default
    private Boolean mascotMuted = false;

    /** Null means private. Revoking sharing invalidates the old link. */
    @Column(name = "profile_share_token", unique = true, length = 36)
    private String profileShareToken;

    /** Last global standing acknowledged by the student app; null is first visit. */
    @Column(name = "last_seen_rank")
    private Integer lastSeenRank;

    @Column(name = "google_id", unique = true, columnDefinition = "VARCHAR(100)")
    private String googleId;

    @Column(name = "profile_picture", columnDefinition = "TEXT")
    private String profilePicture;

    @Enumerated(EnumType.STRING)
    @Column(name = "auth_provider", nullable = false, columnDefinition = "VARCHAR(20)")
    @Builder.Default
    private AuthProvider authProvider = AuthProvider.GOOGLE;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    public enum AuthProvider {
        GOOGLE, LOCAL
    }
}
