package com.unlearnarc.canvasanim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.canvasanim.dto.AnimationSceneRequest;
import com.unlearnarc.canvasanim.entity.AnimationScene;
import com.unlearnarc.canvasanim.mapper.AnimationSceneMapper;
import com.unlearnarc.canvasanim.spec.AnimationTrace;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.time.Instant;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class AnimationSceneCatalogTest {
    private final ObjectMapper json = new ObjectMapper();
    private final AnimationSceneMapper mapper = new AnimationSceneMapper(json);

    @Test void thumbnailAndCatalogMetadataRoundTripWithoutChangingTrace() throws Exception {
        var request = json.readValue("""
            {"slug":"sql-join","title":"SQL JOIN","category":"DATABASE","source":"AUTHORED",
             "thumbnailUrl":"/images/animations/join.svg"}
            """, AnimationSceneRequest.class);
        var trace = new AnimationTrace();
        trace.setDuration(2600.0);
        trace.setKeyframes(List.of());
        var entity = mapper.toEntity(request, trace);
        entity.setCreatedAt(Instant.parse("2026-01-01T00:00:00Z"));
        var summary = mapper.toSummary(entity);
        assertEquals(request.getThumbnailUrl(), summary.getThumbnailUrl());
        assertEquals(entity.getCreatedAt(), summary.getCreatedAt());
        assertEquals(2600.0, summary.getDuration());
        assertEquals(0, summary.getKeyframeCount());
        assertEquals(request.getThumbnailUrl(), mapper.toResponse(entity, trace).getThumbnailUrl());
        assertSame(trace, mapper.toResponse(entity, trace).getTrace());
        var oldClient = json.readValue("""
            {"slug":"sql-join","title":"Updated","source":"AUTHORED"}
            """, AnimationSceneRequest.class);
        mapper.applyUpdate(entity, oldClient, trace);
        assertEquals(request.getThumbnailUrl(), entity.getThumbnailUrl());
        oldClient.setThumbnailUrl(null);
        mapper.applyUpdate(entity, oldClient, trace);
        assertNull(entity.getThumbnailUrl());
    }

    @Test void missingTraceDoesNotInventFrameCountsOrDuration() {
        var summary = mapper.toSummary(AnimationScene.builder().title("Generated").build());
        assertNull(summary.getKeyframeCount());
        assertNull(summary.getDuration());
    }

    @Test void validatesOptionalThumbnailReferences() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            var request = new AnimationSceneRequest();
            for (String valid : List.of("/images/animations/join.svg", "https://cdn.example.org/join.webp")) {
                request.setThumbnailUrl(valid);
                assertTrue(validator.validateProperty(request, "thumbnailUrl").isEmpty());
            }
            for (String invalid : List.of("javascript:alert(1)", "data:image/png;base64,invalid", "//example.org/image.svg", "/images/../secret.svg")) {
                request.setThumbnailUrl(invalid);
                assertFalse(validator.validateProperty(request, "thumbnailUrl").isEmpty());
            }
            request.setThumbnailUrl(null);
            assertTrue(validator.validateProperty(request, "thumbnailUrl").isEmpty());
        }
    }
}
