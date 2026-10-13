package com.unlearnarc.domain.dto;

import lombok.Builder;
import lombok.Data;


@Data
@Builder
public class DomainResponse {
    private String id;
    private String name;
}
