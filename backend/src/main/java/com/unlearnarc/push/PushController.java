package com.unlearnarc.push;

import com.unlearnarc.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/push")
@PreAuthorize("hasRole('USER')")
public class PushController {
    private final PushDeliveryService service;

    public PushController(PushDeliveryService service) {
        this.service = service;
    }

    public record ReminderInput(@NotBlank @Size(max=100) String id,
            @NotBlank @Size(max=200) String title, @Positive long at,
            @Pattern(regexp="NONE|DAILY|WEEKLY") @NotNull String repeat, boolean fired) {}
    public record SubscriptionInput(@NotBlank @Pattern(regexp="[a-zA-Z0-9-]{1,36}") String deviceId,
            @NotBlank @Size(max=2048) String endpoint,
            @NotBlank @Size(max=200) String p256dh, @NotBlank @Size(max=100) String auth,
            @PositiveOrZero long dndUntil, @NotNull @Size(max=100) List<@Valid ReminderInput> reminders) {}

    @GetMapping("/config")
    public ApiResponse<Map<String, Object>> config() {
        return ApiResponse.ok(Map.of("enabled", service.enabled(), "publicKey", service.publicKey()), "Push configuration");
    }
    public record ReminderState(String id, long at, boolean fired) {}

    @PutMapping("/subscription")
    public ApiResponse<List<ReminderState>> subscribe(Authentication auth, @Valid @RequestBody SubscriptionInput input) {
        return ApiResponse.ok(service.subscribe(auth.getName(), input), "Push enabled for this device");
    }
    @DeleteMapping("/subscription/{deviceId}")
    public ApiResponse<Void> unsubscribe(Authentication auth, @PathVariable String deviceId) {
        service.unsubscribe(auth.getName(), deviceId);
        return ApiResponse.ok(null, "Push disabled for this device");
    }
}
