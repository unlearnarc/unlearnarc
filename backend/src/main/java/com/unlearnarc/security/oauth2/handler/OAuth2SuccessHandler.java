package com.unlearnarc.security.oauth2.handler;

import com.unlearnarc.security.jwt.JwtTokenProvider;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/**
 * Called by Spring Security after a successful Google OAuth2 login.
 *
 * Flow:
 *  1. Extract the authenticated Google user's email from OAuth2User attributes.
 *  2. Load the local User from DB (upserted already by GoogleOAuth2UserService).
 *  3. Mint a JWT access-token + refresh-token.
 *  4. Invalidate the OAuth2 session (no longer needed — JWT takes over).
 *  5. Redirect to the frontend callback URL with tokens in query params.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserRepository   userRepository;

    @Value("${app.oauth2.redirect-uri:http://localhost:3002/auth/callback}")
    private String frontendRedirectUri;

    @Value("${app.oauth2.failure-redirect-uri:http://localhost:3002/auth/error}")
    private String frontendFailureUri;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest  request,
            HttpServletResponse response,
            Authentication      authentication) throws IOException {

        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        log.info("[OAUTH2] Google login succeeded");

        if (email == null || email.isBlank()) {
            log.error("[OAUTH2] No email in Google profile — cannot proceed.");
            getRedirectStrategy().sendRedirect(request, response,
                    frontendFailureUri + "?error=" +
                    URLEncoder.encode("Email not returned by Google", StandardCharsets.UTF_8));
            return;
        }

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            log.error("[OAUTH2] Account setup failed after login");
            getRedirectStrategy().sendRedirect(request, response,
                    frontendFailureUri + "?error=" +
                    URLEncoder.encode("Account setup failed, please try again", StandardCharsets.UTF_8));
            return;
        }

        // Mint JWT tokens
        String accessToken  = jwtTokenProvider.generateUserAccessToken(user);
        String refreshToken = jwtTokenProvider.generateUserRefreshToken(user);

        log.info("[OAUTH2] Session issued");

        // Build the frontend redirect URL
        String targetUrl = UriComponentsBuilder
                .fromUriString(frontendRedirectUri)
                .queryParam("token",        accessToken)
                .queryParam("refreshToken", refreshToken)
                .queryParam("userId",       user.getId())
                .queryParam("isNewUser",    Boolean.TRUE.equals(oAuth2User.getAttribute("ua_new_user")))
                .queryParam("name",         user.getName() != null ? user.getName() : "")
                .queryParam("email",        email)
                .queryParam("picture",      user.getProfilePicture() != null
                                                ? user.getProfilePicture() : "")
                .build(false)   // don't encode — UriComponentsBuilder will encode properly
                .toUriString();

        // Invalidate the OAuth2 session — JWT takes over, session is no longer needed
        clearAuthenticationAttributes(request);
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }

        log.debug("[OAUTH2] Redirecting to frontend callback");
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
