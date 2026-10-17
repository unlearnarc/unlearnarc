package com.unlearnarc.algoviz.mapper;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.unlearnarc.algoviz.dto.AlgorithmRequest;
import com.unlearnarc.algoviz.dto.AlgorithmResponse;
import com.unlearnarc.algoviz.dto.AlgorithmSummaryResponse;
import com.unlearnarc.algoviz.entity.Algorithm;
import com.unlearnarc.algoviz.spec.SpecValidationException;
import com.unlearnarc.algoviz.spec.VisualizationSpec;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Map;

/** Converts persisted algorithm JSON and metadata to the existing player/catalog contracts. */
@Component
@RequiredArgsConstructor
public class AlgorithmMapper {
    private final ObjectMapper objectMapper;
    private static final TypeReference<Map<String, Object>> MAP_TYPE = new TypeReference<>() {};

    public Algorithm toEntity(AlgorithmRequest req) {
        return Algorithm.builder()
                .slug(req.getSlug())
                .title(req.getTitle())
                .summary(req.getSummary())
                .thumbnailUrl(req.getThumbnailUrl())
                .usage(req.getUsage())
                .category(req.getCategory())
                .difficulty(req.getDifficulty())
                .complexity(writeJson(req.getComplexity()))
                .visualizer(req.getVisualizer())
                .javaSource(req.getJavaSource())
                .pythonSource(req.getPythonSource())
                .frameSpec(writeJson(req.getSpec()))
                .isPublished(Boolean.TRUE.equals(req.getIsPublished()))
                .version(1)
                .build();
    }

    public void applyUpdate(Algorithm entity, AlgorithmRequest req) {
        entity.setSlug(req.getSlug());
        entity.setTitle(req.getTitle());
        entity.setSummary(req.getSummary());
        // An omitted field from an older client preserves the existing image; explicit null clears it.
        if (req.isThumbnailUrlSupplied()) entity.setThumbnailUrl(req.getThumbnailUrl());
        entity.setUsage(req.getUsage());
        entity.setCategory(req.getCategory());
        entity.setDifficulty(req.getDifficulty());
        entity.setComplexity(writeJson(req.getComplexity()));
        entity.setVisualizer(req.getVisualizer());
        entity.setJavaSource(req.getJavaSource());
        entity.setPythonSource(req.getPythonSource());
        entity.setFrameSpec(writeJson(req.getSpec()));
        if (req.getIsPublished() != null) entity.setIsPublished(req.getIsPublished());
        entity.setVersion(entity.getVersion() == null ? 1 : entity.getVersion() + 1);
    }

    public AlgorithmResponse toResponse(Algorithm e) {
        return AlgorithmResponse.builder()
                .id(e.getId()).slug(e.getSlug()).title(e.getTitle()).summary(e.getSummary())
                .thumbnailUrl(e.getThumbnailUrl()).usage(e.getUsage()).category(e.getCategory())
                .difficulty(e.getDifficulty()).complexity(readMap(e.getComplexity()))
                .visualizer(e.getVisualizer()).javaSource(e.getJavaSource()).pythonSource(e.getPythonSource())
                .spec(readSpec(e.getFrameSpec())).isPublished(e.getIsPublished()).version(e.getVersion())
                .createdAt(e.getCreatedAt()).updatedAt(e.getUpdatedAt()).build();
    }

    public AlgorithmSummaryResponse toSummary(Algorithm e) {
        VisualizationSpec spec = readSpec(e.getFrameSpec());
        return AlgorithmSummaryResponse.builder()
                .id(e.getId()).slug(e.getSlug()).title(e.getTitle()).summary(e.getSummary())
                .thumbnailUrl(e.getThumbnailUrl()).createdAt(e.getCreatedAt()).category(e.getCategory())
                .difficulty(e.getDifficulty()).complexity(readMap(e.getComplexity())).visualizer(e.getVisualizer())
                .isPublished(e.getIsPublished())
                .stepCount(spec != null && spec.getSteps() != null ? spec.getSteps().size() : 0)
                .hasJava(StringUtils.hasText(e.getJavaSource())).hasPython(StringUtils.hasText(e.getPythonSource()))
                .build();
    }

    public VisualizationSpec specOf(AlgorithmRequest req) { return req.getSpec(); }

    private String writeJson(Object value) {
        if (value == null) return null;
        try { return objectMapper.writeValueAsString(value); }
        catch (JsonProcessingException ex) {
            throw new SpecValidationException("Failed to serialize JSON: " + ex.getOriginalMessage());
        }
    }

    private VisualizationSpec readSpec(String json) {
        if (!StringUtils.hasText(json)) return null;
        try { return objectMapper.readValue(json, VisualizationSpec.class); }
        catch (JsonProcessingException ex) {
            throw new SpecValidationException("Stored frame spec is corrupt: " + ex.getOriginalMessage());
        }
    }

    private Map<String, Object> readMap(String json) {
        if (!StringUtils.hasText(json)) return null;
        try { return objectMapper.readValue(json, MAP_TYPE); }
        catch (JsonProcessingException ex) { return null; }
    }
}
