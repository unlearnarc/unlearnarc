package com.unlearnarc.studymaterial.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "study_material")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class StudyMaterial {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private MaterialType type;

    @Column(name = "topic_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String topicId;

    @Column(name = "url", nullable = false, columnDefinition = "TEXT")
    private String url;

    public enum MaterialType {
        VIDEO, ARTICLE, PDF, QUIZ, EXERCISE, SLIDES
    }
}
