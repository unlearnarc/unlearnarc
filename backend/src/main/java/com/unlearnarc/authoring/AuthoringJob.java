package com.unlearnarc.authoring;

import com.unlearnarc.common.UuidEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name = "ai_authoring_job", indexes = @Index(name = "idx_authoring_owner_created", columnList = "owner,createdAt"))
@Getter @Setter
public class AuthoringJob extends UuidEntity {
    @Column(nullable = false, length = 200) private String owner;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private AuthoringModels.Kind kind;
    @Column(length = 36) private String courseId;
    @Column(nullable = false, length = 3000) private String prompt;
    @Column(nullable = false, columnDefinition = "LONGTEXT") private String proposal;
    @Column(nullable = false) private String status = "DRAFT";
    @Column(columnDefinition = "LONGTEXT") private String result;
    @Column(nullable = false) private Instant createdAt = Instant.now();
    private Instant savedAt;
}
