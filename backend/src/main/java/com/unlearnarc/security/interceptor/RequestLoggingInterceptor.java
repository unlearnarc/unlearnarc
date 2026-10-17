package com.unlearnarc.security.interceptor;

import com.unlearnarc.common.SafeLog;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.HandlerMapping;

/** Audit route patterns and outcomes, never identities, IPs, query strings or tokens. */
@Slf4j
@Component
public class RequestLoggingInterceptor implements HandlerInterceptor {
    private static final String START_TIME_ATTR = RequestLoggingInterceptor.class.getName() + ".start";

    @Override
    public boolean preHandle(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response, @NonNull Object handler) {
        request.setAttribute(START_TIME_ATTR, System.nanoTime());
        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response, @NonNull Object handler, Exception ex) {
        Object start = request.getAttribute(START_TIME_ATTR);
        long elapsed = start instanceof Long time ? Math.max(0, (System.nanoTime() - time) / 1_000_000) : 0;
        Object route = request.getAttribute(HandlerMapping.BEST_MATCHING_PATTERN_ATTRIBUTE);
        log.info("[AUDIT] method={} route={} status={} elapsedMs={} outcome={}",
                SafeLog.field(request.getMethod()), SafeLog.field(route), response.getStatus(), elapsed,
                ex == null ? "completed" : "failed");
    }
}
