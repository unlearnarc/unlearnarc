package com.unlearnarc.user;

import com.unlearnarc.common.GlobalExceptionHandler;
import com.unlearnarc.user.controller.ProfileSharingController;
import com.unlearnarc.user.service.ProfileSharingService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ProfileSharingControllerTest {
    private final ProfileSharingService sharing = mock(ProfileSharingService.class);
    private MockMvc mvc;

    @BeforeEach void setup() {
        mvc = MockMvcBuilders.standaloneSetup(new ProfileSharingController(sharing))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test void publicProfileIsSafeAndNotCached() throws Exception {
        when(sharing.publicProfile("token")).thenReturn(new ProfileSharingService.PublicProfile("Student", 100, 3, 2, 8));
        mvc.perform(get("/api/v1/public/profiles/token"))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$.data.name").value("Student"))
                .andExpect(jsonPath("$.data.email").doesNotExist())
                .andExpect(jsonPath("$.data.region").doesNotExist());
    }

    @Test void revokedLinkReturns404ThroughGlobalHandler() throws Exception {
        when(sharing.publicProfile("revoked")).thenThrow(new EntityNotFoundException("Profile unavailable"));
        mvc.perform(get("/api/v1/public/profiles/revoked")).andExpect(status().isNotFound());
    }

    @Test void enableMustBeExplicitAndValid() throws Exception {
        mvc.perform(put("/api/v1/user-auth/me/sharing").principal(new org.springframework.security.authentication.UsernamePasswordAuthenticationToken("student@example.test", "unused"))
                .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(sharing);
    }
}
