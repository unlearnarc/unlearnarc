package com.unlearnarc.studyplan;

import com.unlearnarc.common.UuidEntity;
import com.unlearnarc.course.entity.Course;
import com.unlearnarc.topic.entity.Topic;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import java.time.*;

/** Revision records live alongside learning tasks: interval 0 = learn, 1/3/5/7 = revision.
 * The immutable topic key and title snapshots preserve history if catalog content is removed. */
@Entity
@Table(name = "study_plan_task", uniqueConstraints = @UniqueConstraint(name = "uq_study_topic_interval",
    columnNames = {"plan_id", "topic_key", "revision_interval"}), indexes = {
    @Index(name = "idx_study_due", columnList = "plan_id,scheduled_date"),
    @Index(name = "idx_study_completed", columnList = "plan_id,completed_at")})
@Getter @Setter
public class StudyTask extends UuidEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false) private StudyPlan plan;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "course_id") @OnDelete(action = OnDeleteAction.SET_NULL) private Course course;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "topic_id") @OnDelete(action = OnDeleteAction.SET_NULL) private Topic topic;
    @Column(name = "topic_key", nullable = false, length = 36) private String topicKey;
    @Column(nullable = false) private String title;
    @Column(nullable = false) private String courseName;
    @Column(name = "revision_interval", nullable = false) private int revisionInterval;
    @Column(nullable = false) private String taskType;
    @Column(nullable = false) private String activity;
    @Column(nullable = false) private LocalDate originalLearningDate;
    @Column(name = "scheduled_date", nullable = false) private LocalDate scheduledDate;
    @Column(nullable = false) private int estimatedMinutes;
    @Column(name = "completed_at") private Instant completedAt;
}
