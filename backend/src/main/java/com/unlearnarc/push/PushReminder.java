package com.unlearnarc.push;

import com.unlearnarc.common.UuidEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Entity
@Table(name = "push_reminder", uniqueConstraints = @UniqueConstraint(columnNames = {"subscription_id", "client_id"}))
@Getter @Setter
public class PushReminder extends UuidEntity {
    @Column(name = "subscription_id", nullable = false, length = 36)
    private String subscriptionId;
    @Column(name = "client_id", nullable = false, length = 100)
    private String clientId;
    @Column(nullable = false, length = 200)
    private String title;
    private long originalAt;
    private long dueAt;
    @Column(nullable = false, length = 10)
    private String cadence;
    private boolean fired;
}
