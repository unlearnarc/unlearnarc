package com.unlearnarc.authoring;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.validation.constraints.*;
import java.time.Instant;

public final class AuthoringModels {
    private AuthoringModels() {}
    public enum Kind { TOPICS, ANIMATION }
    public record GenerateRequest(@NotNull Kind kind, @NotBlank @Size(max = 3000) String prompt,
                                  @Size(max = 36) String courseId, @Min(1) @Max(12) int count) {}
    public record ProposalRequest(@NotNull JsonNode proposal) {}
    public record JobView(String id, Kind kind, String courseId, String prompt, JsonNode proposal,
                          String status, JsonNode result, Instant createdAt) {}
}
