package com.unlearnarc.dailyquiz;

import com.unlearnarc.common.UuidEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;

@Entity
@Table(name="daily_quiz_item", uniqueConstraints={
    @UniqueConstraint(name="uq_daily_question",columnNames={"session_id","question_id"}),
    @UniqueConstraint(name="uq_daily_order",columnNames={"session_id","position"})}, indexes={
    @Index(name="idx_daily_item_owner",columnList="user_id,answered_at"),
    @Index(name="idx_daily_exposure",columnList="user_id,question_id,exposed_at")})
@Getter @Setter
public class DailyItem extends UuidEntity {
    @Column(name="session_id",nullable=false,length=36) private String sessionId;
    @Column(name="user_id",nullable=false,length=36) private String userId;
    @Column(name="question_id",nullable=false,length=36) private String questionId;
    @Column(nullable=false) private int position;
    @Column(length=36) private String topicId;
    @Column(length=36) private String courseId;
    private String topicName;
    @Column(nullable=false) private String reason;
    @Column(nullable=false) private String difficulty;
    @Column(nullable=false) private String questionType;
    @Column(nullable=false,columnDefinition="MEDIUMTEXT") private String questionText;
    /** Private server-only immutable snapshot, including answer key. Never serialize entities. */
    @Column(nullable=false,columnDefinition="LONGTEXT") private String optionsJson;
    @Column(columnDefinition="LONGTEXT") private String explanation;
    @Column(columnDefinition="TEXT") private String selectedJson;
    private Boolean correct;
    @Column(name="answered_at") private Instant answeredAt;
    @Column(name="exposed_at",nullable=false) private Instant exposedAt;
}
