package com.unlearnarc.security.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.common.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;

/**
 * Returns 401 Unauthorized as clean JSON when a request reaches a protected
 * endpoint with no valid JWT token.
 *
 * Spring Security invokes this when authentication is missing or fails —
 * NOT when a valid token has insufficient role (that is handled by
 * {@link JwtAccessDeniedHandler}).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    @Override
    public void commence(
            HttpServletRequest  request,
            HttpServletResponse response,
            AuthenticationException authException) throws IOException {

        log.warn("[SECURITY] 401 Unauthorized");

        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write(
                objectMapper.writeValueAsString(
                        ApiResponse.error("Unauthorized – valid Bearer token required.")));
    }
}
