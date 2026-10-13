package com.unlearnarc.security.oauth2.service;

import com.unlearnarc.security.oauth2.dto.OAuthUserInfo;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.entity.User.AuthProvider;
import com.unlearnarc.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserRequest;
import org.springframework.security.oauth2.client.oidc.userinfo.OidcUserService;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2UserAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.Set;

/**
 * Loads the Google user profile, then upserts the local {@link User} record.
 *
 * IMPORTANT: Because the Google scope includes "openid", Spring Security runs this
 * as an OIDC login, NOT a plain OAuth2 login. That means Spring uses an
 * {@link OidcUserService} and IGNORES any {@code userInfoEndpoint().userService(...)}.
 * Therefore this class exposes BOTH entry points:
 *   - {@link #loadUser(OAuth2UserRequest)}  → non-OIDC OAuth2 logins
 *   - the inner {@link #oidcUserService()}  → OIDC logins (the real path for Google w/ openid)
 * Both funnel through the same {@link #upsertUser} so the DB row is always created.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    /**
     * OIDC entry point — this is the one actually used for Google login with the
     * "openid" scope. Registered via {@code .oidcUserService(...)} in SecurityConfig.
     */
    public OidcUserService oidcUserService() {
        GoogleOAuth2UserService self = this;
        OidcUserService delegate = new OidcUserService();
        return new OidcUserService() {
            @Override
            @Transactional
            public OidcUser loadUser(OidcUserRequest userRequest) throws OAuth2AuthenticationException {
                OidcUser oidcUser = delegate.loadUser(userRequest);
                Map<String, Object> attributes = oidcUser.getAttributes();

                OAuthUserInfo userInfo = self.extractUserInfo(attributes);
                self.validate(userInfo);
                User user = self.upsertUser(userInfo);
                log.info("[OAUTH2] User authenticated via Google (OIDC): {}", user.getEmail());

                // Return an OidcUser carrying ROLE_USER + the original id-token/userinfo.
                return new DefaultOidcUser(
                        Set.of(new OAuth2UserAuthority("ROLE_USER", attributes)),
                        oidcUser.getIdToken(),
                        oidcUser.getUserInfo(),
                        "email"            // nameAttributeKey
                );
            }
        };
    }

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {

        // 1. Fetch raw attributes from Google's UserInfo endpoint
        OAuth2User oAuth2User = super.loadUser(userRequest);
        Map<String, Object> attributes = oAuth2User.getAttributes();

        // 2. Normalise into our DTO
        OAuthUserInfo userInfo = extractUserInfo(attributes);

        // 3. Validate email is present and verified
        validate(userInfo);

        // 4. Upsert user in DB
        User user = upsertUser(userInfo);
        log.info("[OAUTH2] User authenticated via Google: {}", user.getEmail());

        // 5. Return a DefaultOAuth2User the security context can work with
        return new DefaultOAuth2User(
                Set.of(new OAuth2UserAuthority("ROLE_USER", attributes)),
                attributes,
                "email"                        // nameAttributeKey
        );
    }

    // ── helper: validate email present + verified ─────────────────────────────
    private void validate(OAuthUserInfo userInfo) {
        if (userInfo.getEmail() == null || userInfo.getEmail().isBlank()) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("invalid_email"),
                    "Email not provided by Google. Please allow email access.");
        }
        if (Boolean.FALSE.equals(userInfo.getEmailVerified())) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("email_not_verified"),
                    "Your Google account's email is not verified.");
        }
    }

    // ── helper: build OAuthUserInfo from Google attributes ────────────────────
    private OAuthUserInfo extractUserInfo(Map<String, Object> attrs) {
        return OAuthUserInfo.builder()
                .googleId((String) attrs.get("sub"))
                .email((String) attrs.get("email"))
                .name((String) attrs.get("name"))
                .profilePicture((String) attrs.get("picture"))
                .emailVerified((Boolean) attrs.getOrDefault("email_verified", false))
                .build();
    }

    // ── helper: find-or-create user record ────────────────────────────────────
    private User upsertUser(OAuthUserInfo info) {
        return userRepository.findByEmail(info.getEmail())
                .map(existing -> updateExistingUser(existing, info))
                .orElseGet(() -> createNewUser(info));
    }

    private User updateExistingUser(User user, OAuthUserInfo info) {
        // Refresh mutable profile fields on every login
        user.setName(info.getName());
        user.setGoogleId(info.getGoogleId());
        user.setProfilePicture(info.getProfilePicture());
        user.setAuthProvider(AuthProvider.GOOGLE);
        user.setIsActive(true);
        return userRepository.save(user);
    }

    private User createNewUser(OAuthUserInfo info) {
        User newUser = User.builder()
                .name(info.getName())
                .email(info.getEmail())
                .googleId(info.getGoogleId())
                .profilePicture(info.getProfilePicture())
                .authProvider(AuthProvider.GOOGLE)
                .region("UNKNOWN")   // region is optional for OAuth signups; avoid NOT NULL insert failures
                .rank(0L)
                .points(0L)
                .isActive(true)
                .build();
        return userRepository.save(newUser);
    }
}
