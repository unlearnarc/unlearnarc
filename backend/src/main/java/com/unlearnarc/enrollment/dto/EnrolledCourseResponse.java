package com.unlearnarc.enrollment.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class EnrolledCourseResponse {
    private String id;
    private String userId;
    private String courseId;
    private LocalDateTime enrolledAt;
}
