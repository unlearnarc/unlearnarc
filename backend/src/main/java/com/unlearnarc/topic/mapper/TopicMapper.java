package com.unlearnarc.topic.mapper;

import com.unlearnarc.topic.dto.TopicRequest;
import com.unlearnarc.topic.dto.TopicResponse;
import com.unlearnarc.topic.entity.Topic;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface TopicMapper {

    Topic toEntity(TopicRequest request);

    TopicResponse toResponse(Topic topic);

    void updateEntity(TopicRequest request, @MappingTarget Topic topic);
}
