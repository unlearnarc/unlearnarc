package com.unlearnarc.studymaterial.dto;

import com.unlearnarc.studymaterial.entity.StudyMaterial.MaterialType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;


@Data
public class StudyMaterialRequest {

    @NotNull(message = "Material type must not be null")
    private MaterialType type;

    @NotNull(message = "Topic ID must not be null")
    private String topicId;

    @NotBlank(message = "URL must not be blank")
    private String url;
}
