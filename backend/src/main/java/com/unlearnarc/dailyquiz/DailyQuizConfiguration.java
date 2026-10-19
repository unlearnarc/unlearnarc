package com.unlearnarc.dailyquiz;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import java.time.ZoneId;
/** Fail fast for unsafe deployment configuration rather than create malformed daily sessions. */
@Component @RequiredArgsConstructor
public class DailyQuizConfiguration {
    private final DailyQuizRules rules;
    @PostConstruct void validate(){
        if(rules.getTargetCount()<1||rules.getTargetCount()>30||rules.getMinimumUsefulSize()<1
            ||rules.getMinimumEvidence()<3||rules.getRecentWindow()<rules.getMinimumEvidence()
            ||rules.getProficientQuestions()<rules.getMinimumEvidence()||rules.getMasteredQuestions()<rules.getProficientQuestions()
            ||rules.getMasteredSessions()<3||rules.getRepetitionDays()<0||rules.getRevisionDays()<1
            ||rules.getProficientReviewDays()<1||rules.getMasteredReviewDays()<1
            ||rules.getImprovementShare()<0||rules.getRevisionShare()<0||rules.getImprovementShare()+rules.getRevisionShare()>1
            ||!(0<=rules.getFoundationAccuracy()&&rules.getFoundationAccuracy()<rules.getPracticeAccuracy()
                &&rules.getPracticeAccuracy()<rules.getProficientAccuracy()&&rules.getProficientAccuracy()<rules.getMasteredAccuracy()&&rules.getMasteredAccuracy()<=1))
            throw new IllegalArgumentException("Invalid daily quiz rule configuration");
        ZoneId.of(rules.getDefaultTimeZone());
    }
}
