package com.unlearnarc.mapping.dto;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class UserDomainMappingResponse {
    private String id;
    private String userId;
    private String domainId;
}
