package com.unlearnarc.topic.dto;

import com.unlearnarc.topic.entity.Topic.TopicLevel;
import lombok.Builder;
import lombok.Data;

import java.time.LocalTime;

@Data
@Builder
public class TopicResponse {
    private String id;
    private String name;
    private LocalTime time;
    private Long topicOrder;
    private TopicLevel level;
    private String courseId;
}
