package com.unlearnarc.security.oauth2.handler;

import com.unlearnarc.security.jwt.JwtTokenProvider;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class OAuth2SuccessHandlerTest {
    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void forwardsRegistrationFlagAndInvalidatesSession(boolean isNewUser) throws Exception {
        JwtTokenProvider tokens = mock(JwtTokenProvider.class);
        UserRepository users = mock(UserRepository.class);
        User user = User.builder().email("learner@example.test").name("Learner").build();
        when(users.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(tokens.generateUserAccessToken(user)).thenReturn("access");
        when(tokens.generateUserRefreshToken(user)).thenReturn("refresh");
        OAuth2SuccessHandler handler = new OAuth2SuccessHandler(tokens, users);
        ReflectionTestUtils.setField(handler, "frontendRedirectUri", "http://localhost:3002/auth/callback");
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("ROLE_USER")),
                Map.of("email", user.getEmail(), "ua_new_user", isNewUser), "email");
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.getSession();
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, new TestingAuthenticationToken(principal, null));

        assertThat(response.getRedirectedUrl()).contains("isNewUser=" + isNewUser);
        assertThat(request.getSession(false)).isNull();
    }
}
