package com.unlearnarc.quspool.service;

import com.unlearnarc.quspool.entity.Question.QuestionType;
import java.util.Set;

/** Shared exact-set grading semantics for existing tests and persisted daily sessions. */
public final class ChoiceAnswerEvaluator {
    private ChoiceAnswerEvaluator() {}
    public static boolean correct(QuestionType type, Set<String> key, Set<String> selected) {
        if(type==null || key==null || key.isEmpty() || selected==null || selected.isEmpty()) return false;
        if(type==QuestionType.MCQ && (key.size()!=1 || selected.size()!=1)) return false;
        return selected.equals(key);
    }
}
