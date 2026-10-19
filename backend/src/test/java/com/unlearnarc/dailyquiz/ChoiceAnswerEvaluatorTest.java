package com.unlearnarc.dailyquiz;
import com.unlearnarc.quspool.service.ChoiceAnswerEvaluator;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import org.junit.jupiter.api.Test;
import java.util.Set;
import static org.assertj.core.api.Assertions.*;
class ChoiceAnswerEvaluatorTest {
    @Test void singleChoiceRequiresExactValidKey(){assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MCQ,Set.of("a"),Set.of("a"))).isTrue();assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MCQ,Set.of("a"),Set.of("b"))).isFalse();}
    @Test void multiChoiceRequiresAllAndOnlyCorrectOptions(){assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MULTIPLE_CORRECT,Set.of("a","b"),Set.of("a","b"))).isTrue();assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MULTIPLE_CORRECT,Set.of("a","b"),Set.of("a"))).isFalse();assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MULTIPLE_CORRECT,Set.of("a","b"),Set.of("a","b","c"))).isFalse();}
    @Test void unsupportedOrUnansweredCannotBeCorrect(){assertThat(ChoiceAnswerEvaluator.correct(null,Set.of("a"),Set.of("a"))).isFalse();assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MCQ,Set.of(),Set.of())).isFalse();assertThat(ChoiceAnswerEvaluator.correct(QuestionType.MCQ,Set.of("a"),Set.of())).isFalse();}
}
