package com.unlearnarc.mapping.mapper;

import com.unlearnarc.mapping.dto.*;
import com.unlearnarc.mapping.entity.DomainSkillMapping;
import com.unlearnarc.mapping.entity.SkillCourseMapping;
import com.unlearnarc.mapping.entity.UserDomainMapping;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface MappingMapper {

    DomainSkillMapping toEntity(DomainSkillMappingRequest request);
    DomainSkillMappingResponse toResponse(DomainSkillMapping entity);

    UserDomainMapping toEntity(UserDomainMappingRequest request);
    UserDomainMappingResponse toResponse(UserDomainMapping entity);

    SkillCourseMapping toEntity(SkillCourseMappingRequest request);
    SkillCourseMappingResponse toResponse(SkillCourseMapping entity);
}
