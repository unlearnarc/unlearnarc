package com.unlearnarc.interview.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * A student-shared interview experience, written as a story.
 *
 * Maps to table `interview_experience`. Created automatically by Hibernate
 * (spring.jpa.hibernate.ddl-auto=update).
 */
@Entity
@Table(
        name = "interview_experience",
        indexes = {
                @Index(name = "idx_ie_user",     columnList = "user_id"),
                @Index(name = "idx_ie_company",  columnList = "company"),
                @Index(name = "idx_ie_passed",   columnList = "is_passed"),
                @Index(name = "idx_ie_verified", columnList = "is_verified")
        }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class InterviewExperience {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    /** The student who shared this experience (FK -> user.id). */
    @Column(name = "user_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String userId;

    /** Whether the student passed/cleared the interview. */
    @Column(name = "is_passed", nullable = false)
    @Builder.Default
    private Boolean isPassed = false;

    @Column(name = "company", nullable = false, columnDefinition = "VARCHAR(150)")
    private String company;

    @Column(name = "city", columnDefinition = "VARCHAR(100)")
    private String city;

    @Column(name = "role", nullable = false, columnDefinition = "VARCHAR(150)")
    private String role;

    /** The full interview story written by the student. */
    @Column(name = "experience", nullable = false, columnDefinition = "LONGTEXT")
    private String experience;

    /** Admin moderation flag. New posts start unverified and are hidden from the public feed. */
    @Column(name = "is_verified", nullable = false)
    @Builder.Default
    private Boolean isVerified = false;

    /** The admin (user id) who verified the post, null until verified. */
    @Column(name = "verified_by", columnDefinition = "VARCHAR(36)")
    private String verifiedBy;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
