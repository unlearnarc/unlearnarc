package com.unlearnarc.canvasanim.simulator;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Auto-discovers every {@link SceneSimulator} bean and indexes it by its
 * {@code kind()}. New simulators register themselves simply by being Spring
 * components — nothing here needs editing to extend the catalog.
 */
@Slf4j
@Component
public class SceneSimulatorRegistry {

    private final Map<String, SceneSimulator> byKind = new LinkedHashMap<>();
    private final List<SceneSimulator> simulators;

    public SceneSimulatorRegistry(List<SceneSimulator> simulators) {
        this.simulators = simulators;
    }

    @PostConstruct
    void index() {
        for (SceneSimulator s : simulators) {
            SceneSimulator existing = byKind.putIfAbsent(s.kind(), s);
            if (existing != null) {
                throw new IllegalStateException(
                        "Duplicate SceneSimulator kind '" + s.kind() + "': " +
                        existing.getClass().getSimpleName() + " vs " +
                        s.getClass().getSimpleName());
            }
        }
        log.info("[CANVAS-ANIM] Registered {} simulator(s): {}",
                byKind.size(), byKind.keySet());
    }

    public Optional<SceneSimulator> find(String kind) {
        return Optional.ofNullable(byKind.get(kind));
    }

    public SceneSimulator require(String kind) {
        return find(kind).orElseThrow(() ->
                new IllegalArgumentException("Unknown simulator kind: " + kind));
    }

    /** Catalog of available simulators for the admin UI. */
    public List<Map<String, Object>> catalog() {
        return byKind.values().stream()
                .<Map<String, Object>>map(s -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("kind", s.kind());
                    m.put("displayName", s.displayName());
                    m.put("category", s.category());
                    m.put("description", s.description());
                    m.put("paramSchema", s.paramSchema());
                    return m;
                })
                .toList();
    }
}
