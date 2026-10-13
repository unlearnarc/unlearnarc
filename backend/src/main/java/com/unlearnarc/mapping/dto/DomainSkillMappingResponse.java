package com.unlearnarc.mapping.dto;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class DomainSkillMappingResponse {
    private String id;
    private String domainId;
    private String skillId;
}
