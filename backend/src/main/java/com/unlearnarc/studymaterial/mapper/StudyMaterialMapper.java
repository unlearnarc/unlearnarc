package com.unlearnarc.studymaterial.mapper;

import com.unlearnarc.studymaterial.dto.StudyMaterialRequest;
import com.unlearnarc.studymaterial.dto.StudyMaterialResponse;
import com.unlearnarc.studymaterial.entity.StudyMaterial;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudyMaterialMapper {

    StudyMaterial toEntity(StudyMaterialRequest request);

    StudyMaterialResponse toResponse(StudyMaterial studyMaterial);

    void updateEntity(StudyMaterialRequest request, @MappingTarget StudyMaterial studyMaterial);
}
