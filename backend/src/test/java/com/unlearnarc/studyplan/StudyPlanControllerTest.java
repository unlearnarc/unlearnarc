package com.unlearnarc.studyplan;

import com.unlearnarc.common.GlobalExceptionHandler;
import org.junit.jupiter.api.*;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class StudyPlanControllerTest {
    final StudyPlanService service=mock(StudyPlanService.class);
    MockMvc mvc;
    @BeforeEach void setup() { mvc=MockMvcBuilders.standaloneSetup(new StudyPlanController(service)).setControllerAdvice(new GlobalExceptionHandler()).build(); }
    @Test void rejectsMissingPreferences() throws Exception {
        mvc.perform(put("/api/v1/study-plan/preferences").principal(new UsernamePasswordAuthenticationToken("student@test.local","unused"))
            .contentType(MediaType.APPLICATION_JSON).content("{}"))
            .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
    @Test void taskCompletionUsesPrincipalNotClientUserId() throws Exception {
        mvc.perform(post("/api/v1/study-plan/tasks/task-id/complete?userId=other-account")
            .principal(new UsernamePasswordAuthenticationToken("student@test.local","unused")))
            .andExpect(status().isOk());
        verify(service).complete("student@test.local","task-id");
    }
}
