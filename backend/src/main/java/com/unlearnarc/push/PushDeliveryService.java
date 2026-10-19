package com.unlearnarc.push;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.net.URI;
import java.security.Security;
import java.util.*;

@Service
@Slf4j
public class PushDeliveryService {
    private final PushSubscriptionRepository subscriptions;
    private final PushReminderRepository reminders;
    private final ObjectMapper mapper;
    private final String publicKey;
    private final PushService sender;

    public PushDeliveryService(PushSubscriptionRepository subscriptions, PushReminderRepository reminders,
            ObjectMapper mapper, @Value("${app.push.public-key:}") String publicKey,
            @Value("${app.push.private-key:}") String privateKey,
            @Value("${app.push.subject:}") String subject) throws Exception {
        this.subscriptions = subscriptions;
        this.reminders = reminders;
        this.mapper = mapper;
        this.publicKey = publicKey;
        if (!publicKey.isBlank() && !privateKey.isBlank() && !subject.isBlank()) {
            if (Security.getProvider("BC") == null) Security.addProvider(new BouncyCastleProvider());
            sender = new PushService(publicKey, privateKey, subject);
        } else sender = null;
    }

    public boolean enabled() { return sender != null; }
    public String publicKey() { return enabled() ? publicKey : ""; }

    // Subscription URLs cause outbound requests: accept only known browser push services.
    static void validateEndpoint(String endpoint) {
        URI uri;
        try { uri = URI.create(endpoint); }
        catch (Exception e) { throw new IllegalArgumentException("Invalid push endpoint"); }
        String host = uri.getHost();
        boolean allowed = host != null && (host.equals("fcm.googleapis.com")
                || host.equals("updates.push.services.mozilla.com")
                || host.endsWith(".push.services.mozilla.com")
                || host.equals("web.push.apple.com") || host.endsWith(".notify.windows.com"));
        if (!"https".equals(uri.getScheme()) || !allowed || uri.getUserInfo() != null
                || (uri.getPort() != -1 && uri.getPort() != 443) || uri.getFragment() != null) {
            throw new IllegalArgumentException("Unsupported push endpoint");
        }
    }

    @Transactional
    public List<PushController.ReminderState> subscribe(String email, PushController.SubscriptionInput input) {
        if (!enabled()) throw new IllegalStateException("Push is not configured on the server");
        validateEndpoint(input.endpoint());
        try {
            byte[] key = Base64.getUrlDecoder().decode(input.p256dh());
            if (key.length != 65 || key[0] != 4 || Base64.getUrlDecoder().decode(input.auth()).length != 16)
                throw new IllegalArgumentException();
        } catch (IllegalArgumentException e) { throw new IllegalArgumentException("Invalid push encryption keys"); }
        PushSubscription sub = subscriptions.findByUserEmailAndDeviceId(email, input.deviceId()).orElseGet(PushSubscription::new);
        sub.setUserEmail(email);
        sub.setDeviceId(input.deviceId());
        sub.setEndpoint(input.endpoint());
        sub.setP256dh(input.p256dh());
        sub.setAuth(input.auth());
        sub.setDndUntil(Math.min(input.dndUntil(), System.currentTimeMillis() + 12 * 60 * 60 * 1000L));
        subscriptions.saveAndFlush(sub);
        Map<String, PushReminder> existing = new HashMap<>();
        for (PushReminder r : reminders.findBySubscriptionId(sub.getId())) existing.put(r.getClientId(), r);
        Set<String> seen = new HashSet<>();
        for (var item : input.reminders()) {
            if (!seen.add(item.id())) throw new IllegalArgumentException("Duplicate reminder id");
            PushReminder r = existing.remove(item.id());
            if (r == null) {
                r = new PushReminder();
                r.setSubscriptionId(sub.getId());
                r.setClientId(item.id());
            }
            if (r.getOriginalAt() != item.at()) {
                r.setOriginalAt(item.at());
                // Never rewind a repeating occurrence already delivered by the server.
                r.setDueAt(Math.max(r.getDueAt(), item.at()));
                r.setFired(item.fired());
            }
            r.setTitle(item.title());
            r.setCadence(item.repeat());
            reminders.save(r);
        }
        reminders.deleteAll(existing.values());
        return reminders.findBySubscriptionId(sub.getId()).stream()
                .map(r -> new PushController.ReminderState(r.getClientId(), r.getDueAt(), r.isFired())).toList();
    }

    @Transactional
    public void unsubscribe(String email, String deviceId) {
        subscriptions.findByUserEmailAndDeviceId(email, deviceId).ifPresent(sub -> {
            reminders.deleteBySubscriptionId(sub.getId());
            subscriptions.delete(sub);
        });
    }

    @Scheduled(fixedDelayString = "${app.push.poll-ms:15000}")
    @Transactional
    public void deliverDue() {
        if (!enabled()) return;
        long now = System.currentTimeMillis();
        for (PushReminder r : reminders.findDue(now, PageRequest.of(0, 100))) {
            PushSubscription sub = subscriptions.findById(r.getSubscriptionId()).orElse(null);
            if (sub == null) { reminders.delete(r); continue; }
            if (sub.getDndUntil() > now) continue; // Defer until deep focus ends.
            try {
                byte[] payload = mapper.writeValueAsBytes(Map.of("title", r.getTitle(), "body", "Your learning reminder is due.",
                        "tag", "reminder-" + r.getClientId() + "-" + r.getDueAt(), "url", "/dashboard"));
                var response = sender.send(new Notification(sub.getEndpoint(), sub.getP256dh(), sub.getAuth(), payload));
                int status = response.getStatusLine().getStatusCode();
                if (status == 404 || status == 410) {
                    reminders.deleteBySubscriptionId(sub.getId());
                    subscriptions.delete(sub);
                } else if (status >= 200 && status < 300) {
                    if ("NONE".equals(r.getCadence())) r.setFired(true);
                    else {
                        long step = "DAILY".equals(r.getCadence()) ? 86400000L : 7 * 86400000L;
                        r.setDueAt(r.getDueAt() + ((now - r.getDueAt()) / step + 1) * step);
                    }
                }
            } catch (Exception e) {
                // Do not log endpoints/keys or notification content.
                log.warn("Push delivery failed: {}", e.getClass().getSimpleName());
            }
        }
    }
}
