package com.unlearnarc.security.oauth2.handler;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationFailureHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Called when Google OAuth2 login fails (user denies access, unverified email, etc.).
 * Redirects to the frontend error page with a reason query param.
 */
@Slf4j
@Component
public class OAuth2FailureHandler extends SimpleUrlAuthenticationFailureHandler {

    @Value("${app.oauth2.failure-redirect-uri:http://localhost:3000/auth/error}")
    private String failureRedirectUri;

    @Override
    public void onAuthenticationFailure(
            HttpServletRequest  request,
            HttpServletResponse response,
            AuthenticationException exception) throws IOException {

        log.warn("[OAUTH2] Authentication failure: {}", exception.getMessage());

        String reason = URLEncoder.encode(
                exception.getLocalizedMessage() != null
                        ? exception.getLocalizedMessage()
                        : "Google authentication failed",
                StandardCharsets.UTF_8);

        String targetUrl = UriComponentsBuilder
                .fromUriString(failureRedirectUri)
                .queryParam("error", reason)
                .build()
                .toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
