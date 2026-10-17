package com.unlearnarc.note.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class NoteResponse {
    private String id;
    private String title;
    private String summary;
    private String contentHtml;
    private String coverImageUrl;
    private String blocksJson;
    private String topicId;
    private String courseId;
    private Long noteOrder;
    private Integer readMinutes;
    private Boolean isPublished;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
