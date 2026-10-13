package com.unlearnarc.security.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Isolated config for PasswordEncoder — keeps it out of SecurityConfig
 * so that AdminUserDetailsService can inject it without triggering
 * the circular-reference chain:
 *
 *   JwtAuthenticationFilter → UserDetailsService
 *       → PasswordEncoder (defined here, NOT in SecurityConfig)
 *       → SecurityConfig → JwtAuthenticationFilter  ← cycle BROKEN
 */
@Configuration
public class PasswordEncoderConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
