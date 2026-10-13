package com.unlearnarc.contest.dto;

import com.unlearnarc.contest.entity.Contest.Visibility;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.Instant;

/** Admin create/update contest payload. */
@Data
public class ContestRequest {

    @NotBlank
    @Size(max = 255)
    private String title;

    @Size(max = 255)
    private String slug;          // optional — auto-generated from title when blank

    private String description;

    private Visibility visibility = Visibility.PUBLIC;

    private Instant startTime;
    private Instant endTime;

    private Integer durationMinutes = 0;

    private String allowedLanguages = "python,java,cpp,javascript";

    private Integer wrongSubmissionPenalty = 0;
}
