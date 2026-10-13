package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Join row linking a {@link com.unlearnarc.user.entity.User} to a persisted
 * {@link TestResult}. Mirrors db.md `user_test_attempts`.
 *
 * Kept as a separate table (rather than a user_id column on test_result) so the
 * attempt/result split in the schema is preserved and so a future feature could
 * attach multiple perspectives to one result without schema churn.
 */
@Entity
@Table(name = "user_test_attempts", indexes = {
        @Index(name = "idx_uta_user",        columnList = "user_id"),
        @Index(name = "idx_uta_user_created", columnList = "user_id, created_at"),
        @Index(name = "idx_uta_result",      columnList = "test_id")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class UserTestAttempt {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    /** FK → test_result.id */
    @Column(name = "test_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String testId;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;
}
