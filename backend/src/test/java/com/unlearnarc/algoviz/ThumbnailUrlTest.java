package com.unlearnarc.algoviz;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.algoviz.dto.AlgorithmRequest;
import com.unlearnarc.algoviz.entity.Algorithm;
import com.unlearnarc.algoviz.mapper.AlgorithmMapper;
import com.unlearnarc.algoviz.validation.ThumbnailUrl;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ThumbnailUrlTest {
    @Test void acceptsOnlyPublicReferences() {
        for (String value : new String[]{null, "", "/images/algorithms/bfs.svg", "https://cdn.example.org/preview.svg?v=1"}) {
            assertDoesNotThrow(() -> ThumbnailUrl.validate(value));
        }
        for (String value : new String[]{"javascript:alert(1)", "data:image/svg+xml;base64,xxx", "http://example.org/a.png", "//example.org/a.svg", "/private/file.svg", "/images/algorithms/../secret.svg", "https://user:secret@example.org/a.svg", "https://example.org/a\n.svg", "x".repeat(1025)}) {
            assertThrows(IllegalArgumentException.class, () -> ThumbnailUrl.validate(value), value);
        }
    }
    @Test void mappingPreservesOmittedImageAndSupportsExplicitClear() throws Exception {
        var json = new ObjectMapper();
        var mapper = new AlgorithmMapper(json);
        var entity = Algorithm.builder().thumbnailUrl("/images/algorithms/bfs.svg").build();
        mapper.applyUpdate(entity, json.readValue("{}", AlgorithmRequest.class));
        assertEquals("/images/algorithms/bfs.svg", entity.getThumbnailUrl());
        assertEquals(entity.getThumbnailUrl(), mapper.toSummary(entity).getThumbnailUrl());
        assertEquals(entity.getThumbnailUrl(), mapper.toResponse(entity).getThumbnailUrl());
        mapper.applyUpdate(entity, json.readValue("{\"thumbnailUrl\":null}", AlgorithmRequest.class));
        assertNull(entity.getThumbnailUrl());
        var req = json.readValue("{\"thumbnailUrl\":\"https://example.org/preview.svg\"}", AlgorithmRequest.class);
        assertEquals(req.getThumbnailUrl(), mapper.toEntity(req).getThumbnailUrl());
    }
}
