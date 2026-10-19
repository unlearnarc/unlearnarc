package com.unlearnarc.studyplan;

import com.unlearnarc.common.UuidEntity;
import com.unlearnarc.user.entity.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.*;
import java.util.*;

@Entity
@Table(name = "study_plan")
@Getter @Setter
public class StudyPlan extends UuidEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    @Column(nullable = false) private LocalDate startDate;
    @Column(nullable = false) private String status = "ACTIVE";
    @Column(nullable = false) private int generationVersion;
    @Column(nullable = false) private String goal;
    @Column(nullable = false) private String skillLevel;
    @Column(nullable = false) private int dailyMinutes;
    @Column(nullable = false) private String courseMode;
    @Column(nullable = false) private String timeZone;
    @ElementCollection
    @CollectionTable(name = "study_plan_domains", joinColumns = @JoinColumn(name = "plan_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "domain_id"}))
    @Column(name = "domain_id", nullable = false, length = 36)
    private Set<String> domainIds = new HashSet<>();
    @ElementCollection
    @CollectionTable(name = "study_plan_courses", joinColumns = @JoinColumn(name = "plan_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "course_id"}))
    @Column(name = "course_id", nullable = false, length = 36)
    private Set<String> courseIds = new HashSet<>();
    @ElementCollection
    @CollectionTable(name = "study_plan_days", joinColumns = @JoinColumn(name = "plan_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"plan_id", "study_day"}))
    @Column(name = "study_day", nullable = false)
    private Set<Integer> studyDays = new HashSet<>();
    @CreationTimestamp private Instant createdAt;
    @UpdateTimestamp private Instant updatedAt;
}
