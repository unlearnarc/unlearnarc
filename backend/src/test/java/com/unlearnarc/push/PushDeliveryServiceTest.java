package com.unlearnarc.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class PushDeliveryServiceTest {
    @Test void onlyAllowsBrowserPushHosts() {
        for (String url : List.of("https://fcm.googleapis.com/fcm/send/abc", "https://web.push.apple.com/abc", "https://updates.push.services.mozilla.com/wpush/v2/abc"))
            assertDoesNotThrow(() -> PushDeliveryService.validateEndpoint(url));
        for (String url : List.of("http://fcm.googleapis.com/x", "https://localhost/x", "https://127.0.0.1/x", "https://fcm.googleapis.com.evil.com/x", "https://fcm.googleapis.com@evil.com/x", "https://fcm.googleapis.com:8443/x", "https://fcm.googleapis.com/x#fragment", "not a URL"))
            assertThrows(IllegalArgumentException.class, () -> PushDeliveryService.validateEndpoint(url));
    }
    @Test void unconfiguredPushDoesNotPollOrExposeKey() throws Exception {
        var subscriptions = mock(PushSubscriptionRepository.class);
        var reminders = mock(PushReminderRepository.class);
        var service = new PushDeliveryService(subscriptions, reminders, new ObjectMapper(), "", "", "");
        assertFalse(service.enabled());
        assertEquals("", service.publicKey());
        service.deliverDue();
        verifyNoInteractions(subscriptions, reminders);
        var input = new PushController.SubscriptionInput("device", "https://fcm.googleapis.com/test", "key", "auth", 0, List.of());
        assertThrows(IllegalStateException.class, () -> service.subscribe("user@test.invalid", input));
    }
    @Test void unsubscribeIsScopedToAuthenticatedUserAndDevice() throws Exception {
        var subscriptions = mock(PushSubscriptionRepository.class);
        var reminders = mock(PushReminderRepository.class);
        var service = new PushDeliveryService(subscriptions, reminders, new ObjectMapper(), "", "", "");
        var sub = new PushSubscription(); sub.setId("subscription");
        when(subscriptions.findByUserEmailAndDeviceId("owner@test.invalid", "device")).thenReturn(java.util.Optional.of(sub));
        service.unsubscribe("owner@test.invalid", "device");
        verify(reminders).deleteBySubscriptionId("subscription");
        verify(subscriptions).delete(sub);
    }
}
