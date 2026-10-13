package com.unlearnarc.canvasanim.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.canvasanim.dto.AnimationSceneRequest;
import com.unlearnarc.canvasanim.dto.AnimationSceneResponse;
import com.unlearnarc.canvasanim.dto.AnimationSceneSummaryResponse;
import com.unlearnarc.canvasanim.entity.AnimationScene;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import com.unlearnarc.canvasanim.spec.TraceValidationException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;

/**
 * Converts between the AnimationScene entity (JSON-as-text columns) and DTOs.
 * Jackson is used because the trace schema is simulator-evolvable — adding a
 * field / status / renderer must never require a DB migration.
 */
@Component
@RequiredArgsConstructor
public class AnimationSceneMapper {

    private final ObjectMapper objectMapper;

    public AnimationScene toEntity(AnimationSceneRequest req, AnimationTrace resolvedTrace) {
        return AnimationScene.builder()
                .slug(req.getSlug())
                .title(req.getTitle())
                .description(req.getDescription())
                .category(req.getCategory())
                .source(req.getSource())
                .kind(req.getKind())
                .traceJson(resolvedTrace != null ? writeJson(resolvedTrace) : null)
                .simulatorParams(writeJson(req.getSimulatorParams()))
                .isPublished(Boolean.TRUE.equals(req.getIsPublished()))
                .version(1)
                .build();
    }

    public void applyUpdate(AnimationScene entity, AnimationSceneRequest req,
                            AnimationTrace resolvedTrace) {
        entity.setSlug(req.getSlug());
        entity.setTitle(req.getTitle());
        entity.setDescription(req.getDescription());
        entity.setCategory(req.getCategory());
        entity.setSource(req.getSource());
        entity.setKind(req.getKind());
        entity.setTraceJson(resolvedTrace != null ? writeJson(resolvedTrace) : null);
        entity.setSimulatorParams(writeJson(req.getSimulatorParams()));
        if (req.getIsPublished() != null) entity.setIsPublished(req.getIsPublished());
        entity.setVersion(entity.getVersion() == null ? 1 : entity.getVersion() + 1);
    }

    public AnimationSceneResponse toResponse(AnimationScene e, AnimationTrace resolvedTrace) {
        return AnimationSceneResponse.builder()
                .id(e.getId())
                .slug(e.getSlug())
                .title(e.getTitle())
                .description(e.getDescription())
                .category(e.getCategory())
                .source(e.getSource())
                .kind(e.getKind())
                .trace(resolvedTrace)
                .isPublished(e.getIsPublished())
                .version(e.getVersion())
                .createdAt(e.getCreatedAt())
                .updatedAt(e.getUpdatedAt())
                .build();
    }

    public AnimationSceneSummaryResponse toSummary(AnimationScene e) {
        AnimationTrace trace = StringUtils.hasText(e.getTraceJson())
                ? readTrace(e.getTraceJson()) : null;
        return AnimationSceneSummaryResponse.builder()
                .id(e.getId())
                .slug(e.getSlug())
                .title(e.getTitle())
                .description(e.getDescription())
                .category(e.getCategory())
                .source(e.getSource())
                .kind(e.getKind())
                .isPublished(e.getIsPublished())
                .keyframeCount(trace != null && trace.getKeyframes() != null
                        ? trace.getKeyframes().size() : 0)
                .duration(trace != null ? trace.getDuration() : null)
                .build();
    }

    public AnimationTrace readTrace(String json) {
        if (!StringUtils.hasText(json)) return null;
        try {
            return objectMapper.readValue(json, AnimationTrace.class);
        } catch (JsonProcessingException ex) {
            throw new TraceValidationException("Stored trace is corrupt: " + ex.getOriginalMessage());
        }
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> readParams(String json) {
        if (!StringUtils.hasText(json)) return Map.of();
        try {
            return objectMapper.readValue(json, Map.class);
        } catch (JsonProcessingException ex) {
            return Map.of();
        }
    }

    private String writeJson(Object value) {
        if (value == null) return null;
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException ex) {
            throw new TraceValidationException("Failed to serialize JSON: " + ex.getOriginalMessage());
        }
    }
}
