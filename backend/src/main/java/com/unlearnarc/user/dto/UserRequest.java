package com.unlearnarc.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UserRequest {

    @NotBlank(message = "Name must not be blank")
    private String name;

    @NotBlank(message = "Email must not be blank")
    @Email(message = "Email must be valid")
    private String email;

    // Optional – users created via Google OAuth2 may not have region yet
    private String region;

    // rank and points are managed server-side; admin can override via PUT
    private Long rank;
    private Long points;
}
