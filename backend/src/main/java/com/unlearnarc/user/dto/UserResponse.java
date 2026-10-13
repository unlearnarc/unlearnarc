package com.unlearnarc.user.dto;

import com.unlearnarc.user.entity.User.AuthProvider;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponse {
    private String          id;
    private String        name;
    private String        email;
    private String        region;
    private Long          rank;
    private Long          points;
    private String        googleId;
    private String        profilePicture;
    private AuthProvider  authProvider;
    private Boolean       isActive;
    private LocalDateTime createdAt;
}
