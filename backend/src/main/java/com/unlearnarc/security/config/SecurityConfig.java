package com.unlearnarc.security.config;

import com.unlearnarc.security.jwt.JwtAuthenticationFilter;
import com.unlearnarc.security.oauth2.handler.OAuth2FailureHandler;
import com.unlearnarc.security.oauth2.handler.OAuth2SuccessHandler;
import com.unlearnarc.security.oauth2.service.GoogleOAuth2UserService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Security configuration.
 *
 * Strategy: THIN filter chain + METHOD-LEVEL @PreAuthorize on every controller.
 *
 * Filter chain only handles:
 *   1. OAuth2 browser flow paths → fully open (no token during Google redirect)
 *   2. Public REST endpoints     → fully open (login, health, refresh)
 *   3. Everything else           → must be authenticated (any valid JWT)
 *
 * Fine-grained ADMIN vs USER access is enforced via @PreAuthorize
 * annotations directly on controller methods — giving clean, readable,
 * method-level control instead of fragile URL pattern matching.
 *
 * @EnableMethodSecurity activates @PreAuthorize / @PostAuthorize support.
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
public class SecurityConfig {

    @Value("${app.cors.allowed-origins:http://localhost:3002}")
    private String allowedOriginsCsv;

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final UserDetailsService      userDetailsService;
    private final JwtAuthEntryPoint       jwtAuthEntryPoint;
    private final JwtAccessDeniedHandler  jwtAccessDeniedHandler;
    private final PasswordEncoder         passwordEncoder;
    private final GoogleOAuth2UserService googleOAuth2UserService;
    private final OAuth2SuccessHandler    oAuth2SuccessHandler;
    private final OAuth2FailureHandler    oAuth2FailureHandler;

    public SecurityConfig(
            @Lazy JwtAuthenticationFilter jwtAuthenticationFilter,
            UserDetailsService            userDetailsService,
            JwtAuthEntryPoint             jwtAuthEntryPoint,
            JwtAccessDeniedHandler        jwtAccessDeniedHandler,
            PasswordEncoder               passwordEncoder,
            GoogleOAuth2UserService       googleOAuth2UserService,
            OAuth2SuccessHandler          oAuth2SuccessHandler,
            OAuth2FailureHandler          oAuth2FailureHandler) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.userDetailsService      = userDetailsService;
        this.jwtAuthEntryPoint       = jwtAuthEntryPoint;
        this.jwtAccessDeniedHandler  = jwtAccessDeniedHandler;
        this.passwordEncoder         = passwordEncoder;
        this.googleOAuth2UserService = googleOAuth2UserService;
        this.oAuth2SuccessHandler    = oAuth2SuccessHandler;
        this.oAuth2FailureHandler    = oAuth2FailureHandler;
    }

    // ── CORS ──────────────────────────────────────────────────────────────────
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(allowedOriginsCsv.split(","))
                .map(String::trim)
                .filter(o -> !o.isBlank())
                .toList());
        config.setAllowedMethods(List.of("GET","POST","PUT","DELETE","OPTIONS","PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public HttpSessionOAuth2AuthorizationRequestRepository authorizationRequestRepository() {
        return new HttpSessionOAuth2AuthorizationRequestRepository();
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider p = new DaoAuthenticationProvider();
        p.setUserDetailsService(userDetailsService);
        p.setPasswordEncoder(passwordEncoder);
        return p;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    // ── Single filter chain ───────────────────────────────────────────────────
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // OAuth2 state nonce needs a real session for the Google round-trip.
            // JWT endpoints are effectively stateless (SecurityContext set per-request).
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint(jwtAuthEntryPoint)
                    .accessDeniedHandler(jwtAccessDeniedHandler))

            .authorizeHttpRequests(auth -> auth

                // ── OAuth2 browser flow — no token exists here ──────────────
                .requestMatchers(
                        "/oauth2/**",
                        "/login/oauth2/**",
                        "/error",
                        "/error/**"
                ).permitAll()

                // ── Fully public REST endpoints ─────────────────────────────
                .requestMatchers(HttpMethod.POST,
                        "/api/v1/auth/login",
                        "/api/v1/auth/refresh",
                        "/api/v1/user-auth/refresh"
                ).permitAll()

                .requestMatchers(HttpMethod.GET,
                        "/api/v1/auth/health",
                        "/api/v1/health"
                ).permitAll()

                // ── OpenAPI spec + Swagger UI (dev/docs) ────────────────────
                .requestMatchers(
                        "/v3/api-docs",
                        "/v3/api-docs/**",
                        "/v3/api-docs.yaml",
                        "/swagger-ui.html",
                        "/swagger-ui/**"
                ).permitAll()

                // ── Public read-only catalog endpoints (no auth) ────────────
                .requestMatchers(HttpMethod.GET,
                        "/api/v1/domains",
                        "/api/v1/domains/*",
                        "/api/v1/courses",
                        "/api/v1/courses/*",
                        "/api/v1/topics",
                        "/api/v1/topics/*",
                        "/api/v1/topics/course/*",
                        "/api/v1/skills",
                        "/api/v1/skills/*",
                        "/api/v1/search",
                        "/api/v1/animation-scenes/published",
                        "/api/v1/animation-scenes/slug/*",
                        // Notes: published book-style lessons are public reads
                        // (mirrors the catalog pattern). Admin CRUD paths below
                        // are NOT here and stay JWT + @PreAuthorize('ADMIN').
                        "/api/v1/notes/topic/*",
                        "/api/v1/notes/course/*"
                ).permitAll()

                // ── TEST-ONLY: contest endpoints open for WASM/sandbox testing ──
                // TODO: REMOVE before production. Lets the student contest flow
                // (list/get/problems/challenge/submit/leaderboard) run without a JWT.
                .requestMatchers("/api/v1/contests/**").permitAll()

                // ── Everything else must carry a valid JWT ──────────────────
                // Fine-grained ADMIN vs USER rules live on @PreAuthorize
                .anyRequest().authenticated()
            )

            // ── Google OAuth2 login ──────────────────────────────────────────
            .oauth2Login(oauth2 -> oauth2
                    .redirectionEndpoint(redir ->
                            redir.baseUri("/oauth2/callback/*"))
                    .authorizationEndpoint(auth ->
                            auth.authorizationRequestRepository(authorizationRequestRepository()))
                    .userInfoEndpoint(ui -> ui
                            // Google with "openid" scope → OIDC login, Spring uses oidcUserService.
                            // Register BOTH so the local User row is upserted regardless of path.
                            .oidcUserService(googleOAuth2UserService.oidcUserService())
                            .userService(googleOAuth2UserService))
                    .successHandler(oAuth2SuccessHandler)
                    .failureHandler(oAuth2FailureHandler)
            )

            // ── JWT filter (skips all /oauth2/** paths internally) ───────────
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .authenticationProvider(authenticationProvider());

        return http.build();
    }
}
