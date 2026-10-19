package com.unlearnarc.dailyquiz;

import com.unlearnarc.common.UuidEntity;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.*;

@Entity
@Table(name="daily_quiz_session", uniqueConstraints=@UniqueConstraint(name="uq_daily_student_date",columnNames={"user_id","learning_date"}),
    indexes=@Index(name="idx_daily_history",columnList="user_id,generated_at"))
@Getter @Setter
public class DailySession extends UuidEntity {
    @Column(name="user_id",nullable=false,length=36) private String userId;
    @Column(name="learning_date",nullable=false) private LocalDate learningDate;
    @Column(nullable=false) private String timeZone;
    @Column(nullable=false) private String status = "GENERATED";
    @Column(nullable=false) private String ruleVersion = DailyQuizRules.VERSION;
    @Column(name="generated_at",nullable=false) private Instant generatedAt;
    private Instant startedAt;
    private Instant submittedAt;
    @Column(columnDefinition="TEXT") private String notices;
}
