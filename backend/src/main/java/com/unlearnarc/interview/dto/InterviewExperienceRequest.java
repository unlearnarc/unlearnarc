package com.unlearnarc.interview.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class InterviewExperienceRequest {

    @NotNull(message = "isPassed must not be null")
    private Boolean isPassed;

    @NotBlank(message = "Company must not be blank")
    @Size(max = 150, message = "Company must be at most 150 characters")
    private String company;

    @Size(max = 100, message = "City must be at most 100 characters")
    private String city;

    @NotBlank(message = "Role must not be blank")
    @Size(max = 150, message = "Role must be at most 150 characters")
    private String role;

    @NotBlank(message = "Experience story must not be blank")
    @Size(max = 20000, message = "Experience is too long")
    private String experience;
}
