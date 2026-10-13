package com.unlearnarc.security.config;

import com.unlearnarc.security.interceptor.ApiRateLimitInterceptor;
import com.unlearnarc.security.interceptor.LoginRateLimitInterceptor;
import com.unlearnarc.security.interceptor.RequestLoggingInterceptor;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final LoginRateLimitInterceptor loginRateLimitInterceptor;
    private final ApiRateLimitInterceptor   apiRateLimitInterceptor;
    private final RequestLoggingInterceptor requestLoggingInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {

        // 1. Login rate-limit — admin login + user token refresh
        registry.addInterceptor(loginRateLimitInterceptor)
                .addPathPatterns(
                        "/api/v1/auth/login",
                        "/api/v1/user-auth/refresh");

        // 2. API rate-limit — all /api/v1/** routes
        registry.addInterceptor(apiRateLimitInterceptor)
                .addPathPatterns("/api/v1/**");

        // 3. Audit logging — all /api/v1/** routes
        registry.addInterceptor(requestLoggingInterceptor)
                .addPathPatterns("/api/v1/**");
    }
}
