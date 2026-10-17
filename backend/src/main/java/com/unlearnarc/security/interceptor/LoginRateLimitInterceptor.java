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
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Applied ONLY to POST /api/v1/auth/login.
 * Limits each IP to 10 login attempts per minute.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class LoginRateLimitInterceptor implements HandlerInterceptor {

    private final RateLimitService rateLimitService;
    private final ObjectMapper objectMapper;

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) throws Exception {

        String ip = resolveClientIp(request);
        long remaining = rateLimitService.remainingLoginTokens(ip);

        if (!rateLimitService.tryConsumeLogin(ip)) {
            log.warn("Login rate-limit exceeded");
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.addHeader("X-RateLimit-Limit",     "10");
            response.addHeader("X-RateLimit-Remaining", "0");
            response.addHeader("Retry-After",           "60");

            String body = objectMapper.writeValueAsString(
                    ApiResponse.error("Too many login attempts. Please try again in 60 seconds."));
            response.getWriter().write(body);
            return false;
        }

        response.addHeader("X-RateLimit-Limit",     "10");
        response.addHeader("X-RateLimit-Remaining", String.valueOf(remaining - 1));
        return true;
    }

    // ── honour X-Forwarded-For when behind a proxy/load-balancer ──────────────
    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
