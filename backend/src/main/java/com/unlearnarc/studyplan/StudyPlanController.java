package com.unlearnarc.studyplan;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.studyplan.StudyPlanModels.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/study-plan")
@PreAuthorize("hasRole('USER')")
@RequiredArgsConstructor
public class StudyPlanController {
    private final StudyPlanService service;
    @GetMapping("/catalog") public ApiResponse<Catalog> catalog() { return ApiResponse.ok(service.catalog(), "Study catalog fetched"); }
    @GetMapping("/preferences") public ApiResponse<Preferences> preferences(Authentication auth) {
        return ApiResponse.ok(service.preferences(auth.getName()), "Study preferences fetched");
    }
    @PutMapping("/preferences") public ApiResponse<Preferences> save(Authentication auth, @Valid @RequestBody Preferences prefs,
            @RequestParam(defaultValue = "false") boolean replaceFuture) {
        return ApiResponse.ok(service.save(auth.getName(), prefs, replaceFuture), "Study preferences saved");
    }
    @PostMapping("/generate") public ApiResponse<Void> generate(Authentication auth, @RequestBody GenerateRequest request) {
        service.generate(auth.getName(), request.replaceFuture()); return ApiResponse.ok(null, "Study plan generated");
    }
    @GetMapping public ApiResponse<Dashboard> dashboard(Authentication auth, @RequestParam(required = false) LocalDate weekStart) {
        return ApiResponse.ok(service.dashboard(auth.getName(), weekStart), "Study plan fetched");
    }
    @GetMapping("/tasks/today") public ApiResponse<List<TaskView>> today(Authentication auth) {
        return ApiResponse.ok(service.dashboard(auth.getName(), null).todayTasks(), "Today's tasks fetched");
    }
    @GetMapping("/tasks/week") public ApiResponse<List<TaskView>> week(Authentication auth, @RequestParam LocalDate weekStart) {
        return ApiResponse.ok(service.dashboard(auth.getName(), weekStart).weekTasks(), "Weekly tasks fetched");
    }
    @GetMapping("/revisions") public ApiResponse<List<TaskView>> revisions(Authentication auth) {
        return ApiResponse.ok(service.dashboard(auth.getName(), null).upcomingRevisions(), "Upcoming revisions fetched");
    }
    @PostMapping("/tasks/{id}/complete") public ApiResponse<Void> complete(Authentication auth, @PathVariable String id) {
        service.complete(auth.getName(), id); return ApiResponse.ok(null, "Study task completed");
    }
}
