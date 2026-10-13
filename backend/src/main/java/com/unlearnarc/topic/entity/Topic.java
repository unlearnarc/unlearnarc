package com.unlearnarc.topic.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "topic")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Topic {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false, columnDefinition = "CHAR(200)")
    private String name;

    @Column(name = "time", nullable = false)
    private LocalTime time;

    @Column(name = "topic_order", nullable = false)
    private Long topicOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    private TopicLevel level;

    @Column(name = "course_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String courseId;

    public enum TopicLevel {
        BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    }
}
