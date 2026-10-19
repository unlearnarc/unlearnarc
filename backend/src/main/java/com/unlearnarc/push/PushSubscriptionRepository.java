package com.unlearnarc.push;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, String> {
    Optional<PushSubscription> findByUserEmailAndDeviceId(String email, String deviceId);
}
