package com.unlearnarc.security.interceptor;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * Structured audit log for every admin API call.
 *
 * Format:
 *   [AUDIT] METHOD /path | principal=email | ip=x.x.x.x | status=200 | 42ms
 */
@Slf4j
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {

    private static final String START_TIME_ATTR = "reqStartTime";

    @Override
    public boolean preHandle(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler) {

        request.setAttribute(START_TIME_ATTR, System.currentTimeMillis());
        return true;
    }

    @Override
    public void afterCompletion(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler,
            Exception ex) {

        long startTime = (Long) request.getAttribute(START_TIME_ATTR);
        long elapsed   = System.currentTimeMillis() - startTime;

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String principal = (auth != null && auth.isAuthenticated()) ? auth.getName() : "anonymous";
        String ip        = resolveClientIp(request);

        if (ex != null) {
            log.error("[AUDIT] {} {} | principal={} | ip={} | status={} | {}ms | error={}",
                    request.getMethod(), request.getRequestURI(),
                    principal, ip, response.getStatus(), elapsed, ex.getMessage());
        } else {
            log.info("[AUDIT] {} {} | principal={} | ip={} | status={} | {}ms",
                    request.getMethod(), request.getRequestURI(),
                    principal, ip, response.getStatus(), elapsed);
        }
    }

    private String resolveClientIp(HttpServletRequest request) {
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
