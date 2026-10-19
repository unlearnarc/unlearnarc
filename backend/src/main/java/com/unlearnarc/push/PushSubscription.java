package com.unlearnarc.push;

import com.unlearnarc.common.UuidEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "push_subscription", uniqueConstraints = @UniqueConstraint(columnNames = {"user_email", "device_id"}))
@Getter @Setter
public class PushSubscription extends UuidEntity {
    @Column(name = "user_email", nullable = false, length = 150)
    private String userEmail;
    @Column(name = "device_id", nullable = false, length = 36)
    private String deviceId;
    @Column(nullable = false, length = 2048)
    private String endpoint;
    @Column(nullable = false, length = 200)
    private String p256dh;
    @Column(nullable = false, length = 100)
    private String auth;
    private long dndUntil;
}
