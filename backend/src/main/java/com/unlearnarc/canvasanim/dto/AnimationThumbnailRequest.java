package com.unlearnarc.canvasanim.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Metadata-only edit; null explicitly clears the reference. */
public record AnimationThumbnailRequest(
        @Size(max = 1024)
        @Pattern(regexp = "^(?:https://[^\\s@]+|/images/[a-zA-Z0-9/_-]+\\.(?:svg|png|webp|jpe?g))$",
                 message = "thumbnailUrl must be an HTTPS URL or a public image path")
        String thumbnailUrl) {}
