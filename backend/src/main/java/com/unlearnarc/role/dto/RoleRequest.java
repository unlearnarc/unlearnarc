package com.unlearnarc.role.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RoleRequest {

    @NotBlank(message = "Role name must not be blank")
    private String name;

    private String description;
}
