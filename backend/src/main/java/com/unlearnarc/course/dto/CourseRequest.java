package com.unlearnarc.course.dto;

import com.unlearnarc.course.entity.Course.CourseLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class CourseRequest {

    @NotBlank(message = "Course name must not be blank")
    private String name;

    @NotNull(message = "Image URL must not be null")
    private Long imgUrl;

    @NotNull(message = "Total time must not be null")
    private LocalTime totalTime;

    @NotNull(message = "Topics count must not be null")
    private Integer topicsCount;

    private String qusPool;

    @NotNull(message = "Level must not be null")
    private CourseLevel level;
}
