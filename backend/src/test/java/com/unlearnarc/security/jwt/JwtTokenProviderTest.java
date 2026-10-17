package com.unlearnarc.security.jwt;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class JwtTokenProviderTest {

    @Test
    void constructsProviderAndSignsAndValidatesAdminToken() {
        JwtTokenProvider provider = new JwtTokenProvider(properties());

        String token = provider.generateAccessTokenFromEmail("admin@example.test");

        assertTrue(provider.validateToken(token));
        assertEquals("admin@example.test", provider.getEmailFromToken(token));
        assertEquals("ADMIN", provider.getRoleFromToken(token));
    }

    @Test
    void constructsProviderAndPreservesUserClaims() {
        JwtTokenProvider provider = new JwtTokenProvider(properties());

        String token = provider.generateUserAccessTokenFromEmail("student@example.test", "42");

        assertTrue(provider.validateToken(token));
        assertEquals("student@example.test", provider.getEmailFromToken(token));
        assertEquals("USER", provider.getRoleFromToken(token));
        assertEquals("42", provider.getUserIdFromToken(token));
    }

    private JwtProperties properties() {
        JwtProperties properties = new JwtProperties();
        properties.setSecret("unit-test-only-signing-secret-at-least-32-bytes-long");
        properties.setExpirationMs(60_000);
        properties.setRefreshExpirationMs(120_000);
        return properties;
    }
}
