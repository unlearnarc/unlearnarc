package com.unlearnarc.security.auth.service;

import com.unlearnarc.security.auth.dto.AuthResponse;
import com.unlearnarc.security.auth.dto.LoginRequest;
import com.unlearnarc.security.auth.dto.RefreshRequest;
import com.unlearnarc.security.jwt.JwtProperties;
import com.unlearnarc.security.jwt.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider      jwtTokenProvider;
    private final JwtProperties         jwtProperties;

    // ── login ──────────────────────────────────────────────────────────────────
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication auth = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(), request.getPassword()));

            String accessToken  = jwtTokenProvider.generateAccessToken(auth);
            String refreshToken = jwtTokenProvider.generateRefreshToken(auth);

            log.info("[AUTH] Admin login successful");

            return AuthResponse.builder()
                    .accessToken(accessToken)
                    .refreshToken(refreshToken)
                    .tokenType("Bearer")
                    .expiresIn(jwtProperties.getExpirationMs() / 1000)
                    .email(request.getEmail())
                    .role("ADMIN")
                    .build();

        } catch (BadCredentialsException ex) {
            log.warn("[AUTH] Failed login attempt");
            throw new BadCredentialsException("Invalid email or password.");
        }
    }

    // ── refresh ────────────────────────────────────────────────────────────────
    public AuthResponse refresh(RefreshRequest request) {
        String refreshToken = request.getRefreshToken();

        if (!jwtTokenProvider.validateToken(refreshToken)) {
            throw new BadCredentialsException("Refresh token is invalid or expired.");
        }

        String email       = jwtTokenProvider.getEmailFromToken(refreshToken);
        String accessToken = jwtTokenProvider.generateAccessTokenFromEmail(email);
        String newRefresh  = jwtTokenProvider.generateAccessTokenFromEmail(email); // rotate

        log.info("[AUTH] Admin session refreshed");

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(newRefresh)
                .tokenType("Bearer")
                .expiresIn(jwtProperties.getExpirationMs() / 1000)
                .email(email)
                .role("ADMIN")
                .build();
    }
}
