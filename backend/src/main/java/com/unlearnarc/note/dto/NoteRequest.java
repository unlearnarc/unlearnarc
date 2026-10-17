package com.unlearnarc.note.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;
import lombok.Data;

/**
 * Admin create/update payload for a Note. Exactly one of {@code topicId} or
 * {@code courseId} must be supplied (validated in the service).
 */
@Data
public class NoteRequest {

    @NotBlank(message = "Title must not be blank")
    @Size(max = 255, message = "Title must be at most 255 characters")
    private String title;

    @Size(max = 500, message = "Summary must be at most 500 characters")
    private String summary;

    @NotBlank(message = "Content must not be blank")
    @Size(max = 200_000, message = "Content is too long")
    private String contentHtml;

    @Size(max = 2000, message = "Cover image URL is too long")
    private String coverImageUrl;

    /** JSON array of embedded visual blocks. Optional. */
    @Size(max = 20_000, message = "Blocks payload is too long")
    private String blocksJson;

    private String topicId;

    private String courseId;

    @PositiveOrZero(message = "Order must be zero or positive")
    private Long noteOrder;

    @PositiveOrZero(message = "Read minutes must be zero or positive")
    private Integer readMinutes;

    private Boolean isPublished;
}
