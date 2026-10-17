package com.unlearnarc.canvasanim;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.canvasanim.dto.AnimationThumbnailRequest;
import com.unlearnarc.canvasanim.entity.AnimationScene;
import com.unlearnarc.canvasanim.mapper.AnimationSceneMapper;
import com.unlearnarc.canvasanim.repository.AnimationSceneRepository;
import com.unlearnarc.canvasanim.service.AnimationSceneService;
import com.unlearnarc.canvasanim.simulator.SceneSimulatorRegistry;
import com.unlearnarc.canvasanim.spec.AnimationTraceValidator;
import jakarta.validation.Validation;
import org.junit.jupiter.api.Test;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AnimationThumbnailUpdateTest {
    @Test void metadataEditNeverRegeneratesOrChangesPlaybackDataAndIsIdempotent() {
        var repository = mock(AnimationSceneRepository.class);
        var simulators = mock(SceneSimulatorRegistry.class);
        var validator = mock(AnimationTraceValidator.class);
        var mapper = new AnimationSceneMapper(new ObjectMapper());
        var service = new AnimationSceneService(repository, mapper, validator, simulators);
        var entity = AnimationScene.builder().id("lesson").slug("atomic-cas-5-threads")
                .traceJson("{\"duration\":16150,\"keyframes\":[]}")
                .simulatorParams("{\"threads\":5}").version(4).isPublished(true).build();
        when(repository.findById("lesson")).thenReturn(Optional.of(entity));
        var response = service.updateThumbnail("lesson", "/images/animations/atomic-cas-5-threads.svg");
        assertEquals(entity.getThumbnailUrl(), response.getThumbnailUrl());
        assertEquals(16150.0, response.getDuration());
        assertEquals("{\"threads\":5}", entity.getSimulatorParams());
        assertEquals("{\"duration\":16150,\"keyframes\":[]}", entity.getTraceJson());
        assertEquals(4, entity.getVersion());
        assertTrue(entity.getIsPublished());
        service.updateThumbnail("lesson", entity.getThumbnailUrl());
        verify(repository, times(1)).save(entity);
        verifyNoInteractions(simulators, validator);
        service.updateThumbnail("lesson", null);
        assertNull(entity.getThumbnailUrl());
    }

    @Test void thumbnailOnlyPayloadValidatesLikeExistingSceneRequests() {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            var validator = factory.getValidator();
            assertTrue(validator.validate(new AnimationThumbnailRequest(null)).isEmpty());
            assertTrue(validator.validate(new AnimationThumbnailRequest("/images/animations/join.svg")).isEmpty());
            assertFalse(validator.validate(new AnimationThumbnailRequest("data:image/svg+xml;base64,AAAA")).isEmpty());
            assertFalse(validator.validate(new AnimationThumbnailRequest("/images/../private.svg")).isEmpty());
        }
    }
}
