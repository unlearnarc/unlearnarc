package com.unlearnarc.security.auth.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class AuthResponse {
    private final String accessToken;
    private final String refreshToken;
    private final String tokenType;
    private final long   expiresIn;   // seconds
    private final String email;
    private final String role;
}
