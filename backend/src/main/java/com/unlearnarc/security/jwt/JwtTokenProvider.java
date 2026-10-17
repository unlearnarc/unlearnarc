package com.unlearnarc.security.jwt;

import com.unlearnarc.user.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@Slf4j
@Component
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;

    public JwtTokenProvider(JwtProperties jwtProperties) {
        this.jwtProperties = jwtProperties;
    }

    // ── build a signing key from the configured secret ─────────────────────────
    private SecretKey signingKey() {
        byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // ── Admin: generate access token from Spring Authentication ───────────────
    public String generateAccessToken(Authentication authentication) {
        String email = ((UserDetails) authentication.getPrincipal()).getUsername();
        return buildToken(email, "ADMIN", jwtProperties.getExpirationMs());
    }

    // ── Admin: generate refresh token from Spring Authentication ──────────────
    public String generateRefreshToken(Authentication authentication) {
        String email = ((UserDetails) authentication.getPrincipal()).getUsername();
        return buildToken(email, "ADMIN", jwtProperties.getRefreshExpirationMs());
    }

    // ── Admin: generate access token from email (refresh flow) ────────────────
    public String generateAccessTokenFromEmail(String email) {
        return buildToken(email, "ADMIN", jwtProperties.getExpirationMs());
    }

    // ── User: generate access token after Google OAuth2 login ─────────────────
    public String generateUserAccessToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role",   "USER")
                .claim("userId", user.getId().toString())
                .claim("name",   user.getName())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtProperties.getExpirationMs())))
                .signWith(signingKey())
                .compact();
    }

    // ── User: generate refresh token after Google OAuth2 login ────────────────
    public String generateUserRefreshToken(User user) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role",   "USER")
                .claim("userId", user.getId().toString())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtProperties.getRefreshExpirationMs())))
                .signWith(signingKey())
                .compact();
    }

    // ── User: refresh access token from refresh token ─────────────────────────
    public String generateUserAccessTokenFromEmail(String email, String userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(email)
                .claim("role",   "USER")
                .claim("userId", userId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(jwtProperties.getExpirationMs())))
                .signWith(signingKey())
                .compact();
    }

    // ── extract subject (email) from token ────────────────────────────────────
    public String getEmailFromToken(String token) {
        return parseClaims(token).getSubject();
    }

    // ── extract role claim from token ─────────────────────────────────────────
    public String getRoleFromToken(String token) {
        return (String) parseClaims(token).get("role");
    }

    // ── extract userId claim from token ───────────────────────────────────────
    public String getUserIdFromToken(String token) {
        return (String) parseClaims(token).get("userId");
    }

    // ── validate token – returns false for any problem ────────────────────────
    public boolean validateToken(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            // Parser messages can contain attacker-controlled claims or token material.
            log.warn("JWT validation failed");
        }
        return false;
    }

    // ── internals ─────────────────────────────────────────────────────────────
    private String buildToken(String subject, String role, long ttlMs) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(subject)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusMillis(ttlMs)))
                .signWith(signingKey())
                .compact();
    }

    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
