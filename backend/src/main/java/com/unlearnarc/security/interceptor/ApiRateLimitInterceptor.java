package com.unlearnarc.security.interceptor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.security.ratelimit.RateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Applied to ALL /api/v1/** routes (after authentication).
 * Limits each authenticated principal (admin email) to
 * 200 requests per minute.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ApiRateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws Exception {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        // Only rate-limit authenticated (admin) calls
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return true;
        }

        String principal = auth.getName();
        long remaining = rateLimitService.remainingApiTokens(principal);

        if (!rateLimitService.tryConsumeApi(principal)) {
            log.warn("API rate-limit exceeded for principal: {}", principal);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.addHeader("X-RateLimit-Limit",     "200");
            response.addHeader("X-RateLimit-Remaining", "0");
            response.addHeader("Retry-After",           "60");

            String body = objectMapper.writeValueAsString(
                    ApiResponse.error("API rate limit exceeded (200 req/min). Please slow down."));
            response.getWriter().write(body);
            return false;
        }

        response.addHeader("X-RateLimit-Limit",     "200");
        response.addHeader("X-RateLimit-Remaining", String.valueOf(remaining - 1));
        return true;
    }
}
