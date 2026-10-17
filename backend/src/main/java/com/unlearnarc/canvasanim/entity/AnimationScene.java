package com.unlearnarc.canvasanim.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Persisted canvas animation scene (a time-based, interpolated visualization),
 * complementary to the step-indexed {@code Algorithm} visualizations.
 *
 * The timeline ("trace") is stored as a JSON string in {@code trace_json}
 * (LONGTEXT) so simulators can evolve the keyframe schema without DB migrations.
 * Typed (de)serialization happens in {@code AnimationSceneMapper} via Jackson.
 *
 * SCALABILITY / EXTENSIBILITY
 * ---------------------------
 * • {@code category} (e.g. CONCURRENCY, SYSTEM_DESIGN, DSA, AI_ML) lets the
 *   catalog grow across tutorial domains with a single indexed filter.
 * • {@code kind} tags the simulator family (e.g. "atomic-cas", "thread-lock",
 *   "packet-routing") so new scene generators can be added without new tables.
 * • JSON trace storage means adding entity fields / statuses / renderers never
 *   requires a schema change.
 */
@Entity
@Table(name = "animation_scene",
       indexes = {
           @Index(name = "idx_anim_scene_slug", columnList = "slug", unique = true),
           @Index(name = "idx_anim_scene_published", columnList = "is_published"),
           @Index(name = "idx_anim_scene_category", columnList = "category"),
           @Index(name = "idx_anim_scene_kind", columnList = "kind")
       })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AnimationScene {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "slug", nullable = false, unique = true, length = 160)
    private String slug;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "thumbnail_url", length = 1024)
    private String thumbnailUrl;

    /** Tutorial domain, e.g. CONCURRENCY / SYSTEM_DESIGN / DSA / AI_ML. */
    @Enumerated(EnumType.STRING)
    @Column(name = "category", length = 32)
    private Category category;

    /** Simulator family tag, e.g. "atomic-cas", "thread-lock", "packet-routing". */
    @Column(name = "kind", length = 64)
    private String kind;

    /**
     * Whether the trace is produced on demand by a server-side simulator
     * (GENERATED) or authored/stored verbatim (AUTHORED). GENERATED scenes may
     * leave {@code traceJson} null and carry {@code simulatorParams} instead.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "source", nullable = false, length = 16)
    @Builder.Default
    private Source source = Source.AUTHORED;

    /** Serialized AnimationTrace (keyframes/entities/connections/variables). */
    @Lob
    @Column(name = "trace_json", columnDefinition = "LONGTEXT")
    private String traceJson;

    /** Optional JSON params a simulator consumes to (re)generate the trace. */
    @Lob
    @Column(name = "simulator_params", columnDefinition = "TEXT")
    private String simulatorParams;

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

    public enum Category { CONCURRENCY, SYSTEM_DESIGN, DSA, AI_ML, NETWORKING, DATABASE, OTHER }

    public enum Source { AUTHORED, GENERATED }
}
