package com.unlearnarc.algoviz;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.UUID;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AlgorithmThumbnailApiTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test @WithMockUser(roles = "ADMIN")
    void thumbnailRoundTripsThroughPersistenceAndBothFeeds() throws Exception {
        String slug = "thumbnail-test-" + UUID.randomUUID();
        var body = json.createObjectNode().put("slug", slug).put("title", "Preview test")
            .put("visualizer", "ARRAY").put("isPublished", true).put("pythonSource", "print(1)")
            .put("thumbnailUrl", "/images/algorithms/bubble-sort.svg");
        body.set("spec", json.readTree("{\"visualizer\":\"ARRAY\",\"steps\":[{\"title\":\"Start\",\"state\":{\"array\":[1]}}]}"));
        String response = mvc.perform(post("/api/v1/algorithms").contentType("application/json").content(body.toString()))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.data.thumbnailUrl").value("/images/algorithms/bubble-sort.svg"))
            .andReturn().getResponse().getContentAsString();
        String id = json.readTree(response).path("data").path("id").asText();
        try {
            mvc.perform(get("/api/v1/algorithms/published"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[?(@.id == '" + id + "')].thumbnailUrl").value("/images/algorithms/bubble-sort.svg"));
            mvc.perform(get("/api/v1/algorithms"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[?(@.id == '" + id + "')].thumbnailUrl").value("/images/algorithms/bubble-sort.svg"));
            body.remove("thumbnailUrl");
            mvc.perform(put("/api/v1/algorithms/" + id).contentType("application/json").content(body.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.thumbnailUrl").value("/images/algorithms/bubble-sort.svg"));
            mvc.perform(get("/api/v1/algorithms/slug/" + slug)).andExpect(jsonPath("$.data.thumbnailUrl").value("/images/algorithms/bubble-sort.svg"));
            body.put("thumbnailUrl", "data:image/png;base64,unsafe");
            mvc.perform(put("/api/v1/algorithms/" + id).contentType("application/json").content(body.toString())).andExpect(status().isBadRequest());
            body.putNull("thumbnailUrl");
            mvc.perform(put("/api/v1/algorithms/" + id).contentType("application/json").content(body.toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.thumbnailUrl").doesNotExist());
        } finally { mvc.perform(delete("/api/v1/algorithms/" + id)).andExpect(status().isOk()); }
    }
    @Test @WithMockUser(roles = "USER")
    void learnerCannotCreateRecords() throws Exception {
        String body = """
            {"slug":"forbidden-test","title":"Forbidden","visualizer":"ARRAY","pythonSource":"print(1)",
             "spec":{"visualizer":"ARRAY","steps":[{"state":{"array":[1]}}]}}
            """;
        mvc.perform(post("/api/v1/algorithms").contentType("application/json").content(body))
            .andExpect(status().isForbidden());
    }
}
