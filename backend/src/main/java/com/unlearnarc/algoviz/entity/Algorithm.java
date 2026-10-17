package com.unlearnarc.algoviz.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted algorithm visualization.
 *
 * The meta ("frame spec") is stored as a JSON string in {@code frame_spec}
 * (LONGTEXT) so authors can evolve the schema without DB migrations. Typed
 * (de)serialization happens in AlgorithmMapper via Jackson.
 */
@Entity
@Table(name = "algorithm",
       indexes = {
           @Index(name = "idx_algorithm_slug", columnList = "slug", unique = true),
           @Index(name = "idx_algorithm_published", columnList = "is_published")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Algorithm {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "slug", nullable = false, unique = true, length = 160)
    private String slug;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "summary", length = 1000)
    private String summary;

    @Column(name = "thumbnail_url", length = 1024)
    private String thumbnailUrl;

    @Lob
    @Column(name = "usage_notes", columnDefinition = "TEXT")
    private String usage;

    @Column(name = "category", length = 80)
    private String category;

    @Enumerated(EnumType.STRING)
    @Column(name = "difficulty", length = 16)
    private Difficulty difficulty;

    /** JSON map, e.g. {"time":"O(n log n)","space":"O(1)"}. */
    @Column(name = "complexity", columnDefinition = "TEXT")
    private String complexity;

    @Enumerated(EnumType.STRING)
    @Column(name = "visualizer", nullable = false, length = 24)
    private Visualizer visualizer;

    @Lob
    @Column(name = "java_source", columnDefinition = "LONGTEXT")
    private String javaSource;

    @Lob
    @Column(name = "python_source", columnDefinition = "LONGTEXT")
    private String pythonSource;

    /** Serialized VisualizationSpec (steps/variables/highlights/inputs). */
    @Lob
    @Column(name = "frame_spec", nullable = false, columnDefinition = "LONGTEXT")
    private String frameSpec;

    @Column(name = "is_published", nullable = false)
    @Builder.Default
    private Boolean isPublished = false;

    @Column(name = "version", nullable = false)
    @Builder.Default
    private Integer version = 1;

    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.id == null) this.id = UUID.randomUUID().toString();
    }

    @PreUpdate
    void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public enum Difficulty { EASY, MEDIUM, HARD }

    /** Canvas renderer kind. Mirrors the frontend VisualizerType union. */
    public enum Visualizer {
        ARRAY, GRAPH, TREE, STACK, QUEUE, LINKED_LIST, MATRIX, CUSTOM
    }
}
