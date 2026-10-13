package com.unlearnarc.interview.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class InterviewExperienceResponse {
    private String id;
    private String userId;
    private String authorName;   // resolved from the user, null if unavailable
    private Boolean isPassed;
    private String company;
    private String city;
    private String role;
    private String experience;
    private Boolean isVerified;
    private String verifiedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
