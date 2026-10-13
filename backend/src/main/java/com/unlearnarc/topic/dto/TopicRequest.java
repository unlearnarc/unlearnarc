package com.unlearnarc.topic.dto;

import com.unlearnarc.topic.entity.Topic.TopicLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalTime;

@Data
public class TopicRequest {

    @NotBlank(message = "Topic name must not be blank")
    private String name;

    @NotNull(message = "Time must not be null")
    private LocalTime time;

    @NotNull(message = "Topic order must not be null")
    private Long topicOrder;

    @NotNull(message = "Level must not be null")
    private TopicLevel level;

    @NotNull(message = "Course ID must not be null")
    private String courseId;
}
