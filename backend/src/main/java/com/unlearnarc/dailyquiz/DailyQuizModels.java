package com.unlearnarc.dailyquiz;
import java.time.*;
import java.util.*;
import jakarta.validation.constraints.*;
public final class DailyQuizModels {
    private DailyQuizModels() {}
    public record Option(String id,String text) {}
    public record KeyOption(String id,String text,boolean correct) {}
    public record AnswerRequest(@NotNull @Size(min=1,max=10) Set<@NotBlank @Size(max=36) String> selectedAnswerIds) {}
    public record ItemView(String id,String questionId,String topicId,String topicName,String href,
        String reason,String selectionExplanation,String difficulty,String questionType,String text,List<Option> options,
        Set<String> selectedAnswerIds,Boolean correct,String explanation,Set<String> correctAnswerIds) {}
    public record SessionView(String id,LocalDate learningDate,String timeZone,String status,String ruleVersion,
        Instant generatedAt,Instant startedAt,Instant submittedAt,int correctCount,int incorrectCount,
        List<ItemView> questions,List<String> notices) {}
    public record Insight(String topicId,String name,String href,DailyQuizRules.Evidence evidence,String recommendation) {}
    public record PolicyRequest(boolean generalDiagnostic,boolean introductory) {}
    public record Quality(String poolId,String name,long activeQuestions,long missingExplanation,long invalidKeys,long topicMappings,boolean generalDiagnostic,boolean introductory) {}
}
