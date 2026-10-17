package com.unlearnarc.authoring;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.web.servlet.MockMvc;
import java.util.List;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(controllers = AuthoringController.class, useDefaultFilters = false,
    includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE, classes = AuthoringController.class))
@Import({AuthoringApiTest.Security.class, AuthoringController.class})
class AuthoringApiTest {
    @Configuration @EnableMethodSecurity
    static class Security {
        @Bean SecurityFilterChain testChain(HttpSecurity http) throws Exception {
            return http.csrf(c -> c.disable()).authorizeHttpRequests(a -> a.anyRequest().authenticated()).build();
        }
    }
    @Autowired MockMvc mvc;
    @MockBean AuthoringService service;
    @MockBean AiContentGenerator generator;
    // The application's JWT filter is discovered separately by the MVC slice.
    @MockBean com.unlearnarc.security.jwt.JwtTokenProvider tokenProvider;
    @MockBean org.springframework.security.core.userdetails.UserDetailsService userDetailsService;

    @Test void anonymousCannotUseAuthoring() throws Exception {
        mvc.perform(get("/api/v1/admin/ai-authoring/status")).andExpect(status().is4xxClientError());
        verifyNoInteractions(generator, service);
    }
    @Test @WithMockUser(roles = "USER") void studentCannotUseAuthoring() throws Exception {
        mvc.perform(get("/api/v1/admin/ai-authoring/status")).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/admin/ai-authoring/jobs/x/save")).andExpect(status().isForbidden());
        verifyNoInteractions(generator, service);
    }
    @Test @WithMockUser(username = "admin", roles = "ADMIN") void adminGetsStatusAndOwnedHistory() throws Exception {
        when(generator.configured()).thenReturn(true);
        when(service.history("admin")).thenReturn(List.of());
        mvc.perform(get("/api/v1/admin/ai-authoring/status")).andExpect(status().isOk()).andExpect(jsonPath("$.data.configured").value(true));
        mvc.perform(get("/api/v1/admin/ai-authoring/jobs")).andExpect(status().isOk());
        verify(service).history("admin");
    }
    @Test @WithMockUser(roles = "ADMIN") void validatesInputBeforeCallingProvider() throws Exception {
        mvc.perform(post("/api/v1/admin/ai-authoring/jobs").contentType("application/json")
            .content("{\"kind\":\"TOPICS\",\"prompt\":\"\",\"count\":99}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
