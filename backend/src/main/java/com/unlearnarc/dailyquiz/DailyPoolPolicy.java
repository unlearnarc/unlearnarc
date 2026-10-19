package com.unlearnarc.dailyquiz;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
/** Opt-in metadata on existing pools. Never creates or copies questions. */
@Entity @Table(name="daily_quiz_pool_policy") @Getter @Setter
public class DailyPoolPolicy {
    @Id @Column(length=36) private String poolId;
    @Column(nullable=false) private boolean generalDiagnostic;
    @Column(nullable=false) private boolean introductory;
}
