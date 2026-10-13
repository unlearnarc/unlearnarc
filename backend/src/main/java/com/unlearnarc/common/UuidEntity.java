package com.unlearnarc.common;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

/**
 * Base class that auto-assigns a random UUID string to `id` before insert.
 * Avoids Hibernate 6 GenerationType.UUID binary storage issues with MySQL VARCHAR(36).
 */
@MappedSuperclass
@Getter
@Setter
public abstract class UuidEntity {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    private String id;

    @PrePersist
    protected void assignId() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
    }
}
