package com.unlearnarc.studymaterial.dto;

import com.unlearnarc.studymaterial.entity.StudyMaterial.MaterialType;
import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class StudyMaterialResponse {
    private String id;
    private MaterialType type;
    private String topicId;
    private String url;
}
