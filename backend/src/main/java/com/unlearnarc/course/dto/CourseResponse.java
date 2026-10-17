package com.unlearnarc.course.dto;

import com.unlearnarc.course.entity.Course.CourseLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class CourseResponse {
    private String id;
    private String name;
    private String imgUrl;
    private LocalTime totalTime;
    private Integer topicsCount;
    private String qusPool;
    private CourseLevel level;
}
