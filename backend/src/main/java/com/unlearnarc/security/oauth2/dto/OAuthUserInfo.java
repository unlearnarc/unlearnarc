package com.unlearnarc.security.oauth2.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Normalised view of a Google OAuth2 user.
 * Extracted from the raw attributes map returned by Google's UserInfo endpoint.
 */
@Data
@Builder
public class OAuthUserInfo {

    private String googleId;       // "sub"  – stable, unique across Google
    private String email;          // "email"
    private String name;           // "name"
    private String profilePicture; // "picture"
    private Boolean emailVerified; // "email_verified"
}
