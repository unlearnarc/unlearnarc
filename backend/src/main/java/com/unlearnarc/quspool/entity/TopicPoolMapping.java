package com.unlearnarc.quspool.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * Links a QuestionPool to a Topic.
 * One topic can have multiple pools.
 * One pool belongs to exactly one topic (scope_type = TOPIC).
 */
@Entity
@Table(name = "topic_pool_mapping",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_topic_pool", columnNames = {"topic_id", "pool_id"}),
        indexes = {
                @Index(name = "idx_tpm_topic", columnList = "topic_id"),
                @Index(name = "idx_tpm_pool",  columnList = "pool_id")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TopicPoolMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "topic_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String topicId;

    @Column(name = "pool_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String poolId;
}
