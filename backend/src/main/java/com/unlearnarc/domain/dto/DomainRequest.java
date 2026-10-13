package com.unlearnarc.domain.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DomainRequest {

    @NotBlank(message = "Domain name must not be blank")
    private String name;
}
