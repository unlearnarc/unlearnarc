package com.unlearnarc.canvasanim.service;

import com.unlearnarc.canvasanim.dto.AnimationSceneRequest;
import com.unlearnarc.canvasanim.dto.AnimationSceneResponse;
import com.unlearnarc.canvasanim.dto.AnimationSceneSummaryResponse;
import com.unlearnarc.canvasanim.entity.AnimationScene;
import com.unlearnarc.canvasanim.entity.AnimationScene.Category;
import com.unlearnarc.canvasanim.entity.AnimationScene.Source;
import com.unlearnarc.canvasanim.mapper.AnimationSceneMapper;
import com.unlearnarc.canvasanim.repository.AnimationSceneRepository;
import com.unlearnarc.canvasanim.simulator.SceneSimulator;
import com.unlearnarc.canvasanim.simulator.SceneSimulatorRegistry;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.AnimationTraceValidator;
import com.unlearnarc.canvasanim.spec.TraceValidationException;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Orchestrates persistence + simulation for canvas animation scenes.
 *
 * Resolution rule:
 *   • AUTHORED  → validate + store the supplied trace verbatim.
 *   • GENERATED → run the matching SceneSimulator to (re)build the trace, store a
 *                 snapshot for fast reads, and keep the params for regeneration.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AnimationSceneService {

    private final AnimationSceneRepository repository;
    private final AnimationSceneMapper mapper;
    private final AnimationTraceValidator validator;
    private final SceneSimulatorRegistry simulators;

    public AnimationSceneResponse create(AnimationSceneRequest request) {
        if (repository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException("Scene slug already exists: " + request.getSlug());
        }
        AnimationTrace trace = resolveTrace(request);
        AnimationScene saved = repository.save(mapper.toEntity(request, trace));
        return mapper.toResponse(saved, trace);
    }

    public AnimationSceneResponse update(String id, AnimationSceneRequest request) {
        AnimationScene entity = getOrThrow(id);
        if (!entity.getSlug().equals(request.getSlug())
                && repository.existsBySlug(request.getSlug())) {
            throw new IllegalArgumentException("Scene slug already exists: " + request.getSlug());
        }
        AnimationTrace trace = resolveTrace(request);
        mapper.applyUpdate(entity, request, trace);
        return mapper.toResponse(repository.save(entity), trace);
    }

    /** Validate (and, for GENERATED, build) without persisting. */
    @Transactional(readOnly = true)
    public AnimationTrace validate(AnimationSceneRequest request) {
        return resolveTrace(request);
    }

    /** On-demand generation preview for the admin UI — no persistence. */
    @Transactional(readOnly = true)
    public AnimationTrace preview(String kind, Map<String, Object> params) {
        SceneSimulator sim = simulators.require(kind);
        AnimationTrace trace = sim.generate(params);
        validator.validate(trace);
        return trace;
    }

    @Transactional(readOnly = true)
    public List<Map<String, Object>> simulatorCatalog() {
        return simulators.catalog();
    }

    @Transactional(readOnly = true)
    public List<AnimationSceneSummaryResponse> findAll(Category category) {
        return repository.catalog(category, false).stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public List<AnimationSceneSummaryResponse> findPublished(Category category) {
        return repository.catalog(category, true).stream().map(mapper::toSummary).toList();
    }

    @Transactional(readOnly = true)
    public AnimationSceneResponse findBySlug(String slug) {
        AnimationScene entity = repository.findBySlug(slug)
                .orElseThrow(() -> new EntityNotFoundException("Scene not found: " + slug));
        return mapper.toResponse(entity, resolveStoredTrace(entity));
    }

    @Transactional(readOnly = true)
    public AnimationSceneResponse findById(String id) {
        AnimationScene entity = getOrThrow(id);
        return mapper.toResponse(entity, resolveStoredTrace(entity));
    }

    public AnimationSceneResponse setPublished(String id, boolean value) {
        AnimationScene entity = getOrThrow(id);
        entity.setIsPublished(value);
        AnimationScene saved = repository.save(entity);
        return mapper.toResponse(saved, resolveStoredTrace(saved));
    }

    /** Never regenerate a trace or reset simulator parameters for a media edit. */
    public AnimationSceneSummaryResponse updateThumbnail(String id, String thumbnailUrl) {
        AnimationScene entity = getOrThrow(id);
        if (!java.util.Objects.equals(entity.getThumbnailUrl(), thumbnailUrl)) {
            entity.setThumbnailUrl(thumbnailUrl);
            repository.save(entity);
        }
        return mapper.toSummary(entity);
    }

    public void delete(String id) {
        getOrThrow(id);
        repository.deleteById(id);
    }

    // ── internals ─────────────────────────────────────────────────────────────

    /** Build the trace for a request (from simulator or supplied), then validate. */
    private AnimationTrace resolveTrace(AnimationSceneRequest request) {
        AnimationTrace trace;
        if (request.getSource() == Source.GENERATED) {
            if (request.getKind() == null || request.getKind().isBlank()) {
                throw new TraceValidationException("kind is required when source = GENERATED");
            }
            SceneSimulator sim = simulators.require(request.getKind());
            trace = sim.generate(request.getSimulatorParams() == null
                    ? Map.of() : request.getSimulatorParams());
        } else {
            if (request.getTrace() == null) {
                throw new TraceValidationException("trace is required when source = AUTHORED");
            }
            trace = request.getTrace();
        }
        validator.validate(trace);
        return trace;
    }

    /** Resolve the trace to return for a stored entity (regenerate if needed). */
    private AnimationTrace resolveStoredTrace(AnimationScene entity) {
        if (entity.getTraceJson() != null) {
            return mapper.readTrace(entity.getTraceJson());
        }
        // GENERATED scene stored without a snapshot — rebuild on the fly.
        if (entity.getSource() == Source.GENERATED && entity.getKind() != null) {
            SceneSimulator sim = simulators.require(entity.getKind());
            AnimationTrace trace = sim.generate(mapper.readParams(entity.getSimulatorParams()));
            validator.validate(trace);
            return trace;
        }
        return null;
    }

    private AnimationScene getOrThrow(String id) {
        return repository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Scene not found: " + id));
    }
}
