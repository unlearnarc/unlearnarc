package com.unlearnarc.dailyquiz;
import com.unlearnarc.dailyquiz.DailyQuizRules.*;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.*;
import static org.assertj.core.api.Assertions.*;

class DailyQuizRulesTest {
    final DailyQuizRules rules=new DailyQuizRules();
    final LocalDate today=LocalDate.of(2025,3,10);
    final ZoneId zone=ZoneId.of("America/New_York");
    final Instant now=today.atTime(12,0).atZone(zone).toInstant();
    Event event(int n,boolean correct){return new Event("e"+n,"s"+(n%3),"q"+n,"t",Difficulty.MEDIUM,correct,now.minusSeconds(n));}
    Evidence evidence(List<Event> events){return rules.evidence("t",events,null,today,zone);}
    @Test void noAttemptsAreNotWeak(){assertThat(evidence(List.of()).state()).isEqualTo(State.NOT_ASSESSED);}
    @Test void oneWrongIsLowConfidence(){var e=evidence(List.of(event(1,false)));assertThat(e.state()).isEqualTo(State.INSUFFICIENT_DATA);assertThat(e.confidence()).isEqualTo("LOW");}
    @Test void oneCorrectCannotEstablishMastery(){assertThat(evidence(List.of(event(1,true))).state()).isEqualTo(State.INSUFFICIENT_DATA);}
    @Test void repeatedDistinctMistakesNeedFoundation(){assertThat(evidence(List.of(event(1,false),event(2,false),event(3,false))).state()).isEqualTo(State.NEEDS_FOUNDATION);}
    @Test void inconsistentEvidenceNeedsPractice(){assertThat(evidence(List.of(event(1,true),event(2,false),event(3,false))).state()).isEqualTo(State.NEEDS_FOUNDATION);assertThat(evidence(List.of(event(1,true),event(2,true),event(3,false),event(4,false))).state()).isEqualTo(State.NEEDS_PRACTICE);}
    @Test void distinctQuestionsAndSessionsEstablishProficiency(){assertThat(evidence(java.util.stream.IntStream.range(0,6).mapToObj(n->event(n,true)).toList()).state()).isEqualTo(State.PROFICIENT);}
    @Test void sustainedChallengingEvidenceCanEstablishMastery(){assertThat(evidence(java.util.stream.IntStream.range(0,10).mapToObj(n->event(n,true)).toList()).state()).isEqualTo(State.MASTERED);}
    @Test void easyOnlyEvidenceDoesNotEstablishMastery(){var es=java.util.stream.IntStream.range(0,12).mapToObj(n->new Event("e"+n,"s"+n,"q"+n,"t",Difficulty.EASY,true,now)).toList();assertThat(evidence(es).state()).isEqualTo(State.DEVELOPING);}
    @Test void repeatedQuestionDoesNotInflateDistinctEvidence(){var es=java.util.stream.IntStream.range(0,12).mapToObj(n->new Event("e"+n,"s"+n,"same","t",Difficulty.HARD,true,now)).toList();assertThat(evidence(es).distinctQuestions()).isEqualTo(1);}
    @Test void improvementIsRecordedWithoutInstantMastery(){var es=List.of(new Event("old","s1","q","t",Difficulty.EASY,false,now.minusSeconds(100)),new Event("new","s2","q","t",Difficulty.EASY,true,now));assertThat(evidence(es).improving()).isTrue();assertThat(evidence(es).state()).isEqualTo(State.INSUFFICIENT_DATA);}
    @Test void learnedTopicBecomesDueButUnlearnedTopicDoesNot(){assertThat(rules.evidence("t",List.of(),now.minusSeconds(86400*7),today,zone).state()).isEqualTo(State.NEEDS_REVISION);assertThat(evidence(List.of()).nextReview()).isNull();}
    List<Pick> select(List<Candidate> pool,Map<String,Evidence> e){return rules.select(pool,e,Set.of(),today,zone,10);}
    @Test void selectionIsDeterministicAndDeduplicated(){var pool=new ArrayList<>(List.of(new Candidate("b","t",Difficulty.EASY,null),new Candidate("a","t",Difficulty.EASY,null),new Candidate("a","t",Difficulty.EASY,null)));var e=Map.of("t",evidence(List.of()));var first=select(pool,e);Collections.reverse(pool);assertThat(select(pool,e)).isEqualTo(first);assertThat(first).hasSize(2);}
    @Test void smallPoolProducesShortQuiz(){assertThat(select(List.of(new Candidate("q","t",Difficulty.EASY,null)),Map.of("t",evidence(List.of())))).hasSize(1);}
    @Test void noEligibleQuestionsReturnsEmpty(){assertThat(select(List.of(),Map.of())).isEmpty();}
    @Test void missingMetadataIsExcluded(){assertThat(select(List.of(new Candidate("q","t",null,null),new Candidate("q2",null,Difficulty.EASY,null)),Map.of("t",evidence(List.of())))).isEmpty();}
    @Test void diagnosticsDoNotForceHardQuestions(){assertThat(select(List.of(new Candidate("q","t",Difficulty.HARD,null)),Map.of("t",evidence(List.of())))).isEmpty();}
    @Test void prefersUnseenOverRecentlyExposed(){var result=select(List.of(new Candidate("a","t",Difficulty.EASY,now),new Candidate("b","t",Difficulty.EASY,null)),Map.of("t",evidence(List.of())));assertThat(result.get(0).question().id()).isEqualTo("b");assertThat(result.get(1).repeated()).isTrue();}
    @Test void emptyCategoriesRedistributeAndRelaxDifficulty(){var result=select(List.of(new Candidate("a","t",Difficulty.MEDIUM,null)),Map.of("t",evidence(List.of())));assertThat(result).hasSize(1);assertThat(result.get(0).relaxedDifficulty()).isTrue();}
    @Test void weakTopicsOutrankUnassessedWhenSupported(){var weak=evidence(List.of(event(1,false),event(2,false),event(3,false)));var fresh=rules.evidence("new",List.of(),null,today,zone);var result=select(List.of(new Candidate("a","new",Difficulty.EASY,null),new Candidate("z","t",Difficulty.EASY,null)),Map.of("t",weak,"new",fresh));assertThat(result.get(0).question().topic()).isEqualTo("t");}
    @Test void reviewDatesUseLocalCalendarAcrossDst(){Instant learned=Instant.parse("2025-03-08T05:30:00Z");assertThat(rules.evidence("t",List.of(),learned,today,zone).nextReview()).isEqualTo(LocalDate.of(2025,3,11));}
    @Test void dueAndMaintenanceReasonsAreDistinct(){assertThat(rules.reason(rules.evidence("t",List.of(),now.minusSeconds(86400*7),today,zone),true)).isEqualTo(Reason.REVISION_DUE);assertThat(rules.reason(evidence(java.util.stream.IntStream.range(0,6).mapToObj(n->event(n,true)).toList()),true)).isEqualTo(Reason.MAINTENANCE_REVIEW);}
}
