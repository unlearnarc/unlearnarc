package com.unlearnarc.mapping.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "skill_course_mapping",
        uniqueConstraints = @UniqueConstraint(columnNames = {"skill_id", "course_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SkillCourseMapping {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "skill_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String skillId;

    @Column(name = "course_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String courseId;
}
