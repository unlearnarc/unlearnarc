package com.unlearnarc.note.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Lightweight list projection — omits the heavy {@code contentHtml}/{@code blocksJson}
 * so topic/course pages can render note cards without transferring full lessons.
 */
@Data
@Builder
public class NoteSummaryResponse {
    private String id;
    private String title;
    private String summary;
    private String coverImageUrl;
    private String topicId;
    private String courseId;
    private Long noteOrder;
    private Integer readMinutes;
    private Boolean isPublished;
    private LocalDateTime updatedAt;
}
