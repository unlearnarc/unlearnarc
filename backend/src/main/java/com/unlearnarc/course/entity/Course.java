package com.unlearnarc.course.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalTime;
import java.util.UUID;

@Entity
@Table(name = "course")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Course {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "img_url", nullable = false)
    private Long imgUrl;

    @Column(name = "total_time", nullable = false)
    private LocalTime totalTime;

    @Column(name = "topics_count", nullable = false)
    private Integer topicsCount;

    @Column(name = "qus_pool", columnDefinition = "VARCHAR(36)")
    private String qusPool;

    @Enumerated(EnumType.STRING)
    @Column(name = "level", nullable = false)
    private CourseLevel level;

    public enum CourseLevel {
        BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    }
}
