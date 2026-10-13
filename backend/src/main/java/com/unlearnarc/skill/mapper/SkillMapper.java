package com.unlearnarc.skill.mapper;

import com.unlearnarc.skill.dto.SkillRequest;
import com.unlearnarc.skill.dto.SkillResponse;
import com.unlearnarc.skill.entity.Skill;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface SkillMapper {

    Skill toEntity(SkillRequest request);

    SkillResponse toResponse(Skill skill);

    void updateEntity(SkillRequest request, @MappingTarget Skill skill);
}
