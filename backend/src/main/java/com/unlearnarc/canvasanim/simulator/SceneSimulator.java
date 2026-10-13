package com.unlearnarc.canvasanim.simulator;

import com.unlearnarc.canvasanim.spec.AnimationTrace;

import java.util.Map;

/**
 * A pluggable generator that turns parameters into a time-based {@link AnimationTrace}.
 *
 * EXTENSIBILITY CONTRACT
 * ----------------------
 * To add a brand-new animated concept (thread locking, packet routing, matrix
 * multiply, …):
 *   1. Implement this interface in a new {@code @Component}.
 *   2. Return a unique {@link #kind()} (e.g. "thread-lock").
 *   3. That's it — {@link SceneSimulatorRegistry} auto-discovers it via Spring
 *      DI; no existing class, switch statement, or table changes are required.
 *      This is the Open/Closed Principle applied to the animation backend.
 */
public interface SceneSimulator {

    /** Unique, stable identifier for this simulator family (kebab-case). */
    String kind();

    /** Human-readable name shown in the admin catalog. */
    String displayName();

    /**
     * Tutorial domain this simulator belongs to, surfaced in the admin catalog
     * so authors can filter by domain. Default: OTHER. Return one of the
     * {@code AnimationScene.Category} names (CONCURRENCY, DSA, AI_ML, …).
     */
    default String category() {
        return "OTHER";
    }

    /** One-line description of what the simulator visualizes. */
    default String description() {
        return "";
    }

    /**
     * Generate a trace from caller-supplied parameters.
     * Implementations MUST validate params and throw
     * {@code IllegalArgumentException} for bad input (surfaced as HTTP 400).
     *
     * @param params simulator-specific inputs (may be empty for defaults)
     */
    AnimationTrace generate(Map<String, Object> params);

    /**
     * Optional JSON-schema-ish hint describing accepted params, surfaced to the
     * admin UI so new simulators are self-documenting. Default: no params.
     */
    default Map<String, Object> paramSchema() {
        return Map.of();
    }
}
