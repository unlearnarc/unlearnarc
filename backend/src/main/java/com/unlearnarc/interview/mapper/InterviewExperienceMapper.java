package com.unlearnarc.interview.mapper;

import com.unlearnarc.interview.dto.InterviewExperienceRequest;
import com.unlearnarc.interview.dto.InterviewExperienceResponse;
import com.unlearnarc.interview.entity.InterviewExperience;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface InterviewExperienceMapper {

    // userId is set from the authenticated principal in the service, not the request body.
    @Mapping(target = "id",         ignore = true)
    @Mapping(target = "userId",     ignore = true)
    @Mapping(target = "isVerified", ignore = true)
    @Mapping(target = "verifiedBy", ignore = true)
    @Mapping(target = "createdAt",  ignore = true)
    @Mapping(target = "updatedAt",  ignore = true)
    InterviewExperience toEntity(InterviewExperienceRequest request);

    @Mapping(target = "authorName", ignore = true) // resolved in the service
    InterviewExperienceResponse toResponse(InterviewExperience entity);

    // Moderation fields are controlled by dedicated admin endpoints, never by an edit.
    @Mapping(target = "id",         ignore = true)
    @Mapping(target = "userId",     ignore = true)
    @Mapping(target = "isVerified", ignore = true)
    @Mapping(target = "verifiedBy", ignore = true)
    @Mapping(target = "createdAt",  ignore = true)
    @Mapping(target = "updatedAt",  ignore = true)
    void updateEntity(InterviewExperienceRequest request, @MappingTarget InterviewExperience entity);
}
