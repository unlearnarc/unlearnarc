package com.unlearnarc.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "domain")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Domain {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "name", nullable = false, columnDefinition = "TEXT")
    private String name;
}
