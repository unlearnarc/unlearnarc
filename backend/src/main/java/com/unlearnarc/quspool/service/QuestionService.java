package com.unlearnarc.quspool.service;

import com.unlearnarc.quspool.dto.*;
import com.unlearnarc.quspool.entity.Answer;
import com.unlearnarc.quspool.entity.Question;
import com.unlearnarc.quspool.entity.Question.Difficulty;
import com.unlearnarc.quspool.entity.Question.QuestionType;
import com.unlearnarc.quspool.repository.AnswerRepository;
import com.unlearnarc.quspool.repository.QuestionRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class QuestionService {

    private final QuestionRepository    questionRepo;
    private final AnswerRepository      answerRepo;
    private final QuestionPoolService   poolService;

    // ── Create question with embedded answers ──────────────────────────────────

    public QuestionResponse create(QuestionRequest req) {
        // 1. Validate pool exists
        poolService.getPoolOrThrow(req.getPoolId());

        // 2. Validate answer rules
        validateAnswers(req.getQuestionType(), req.getAnswers());

        // 3. Save question
        Question question = Question.builder()
                .poolId(req.getPoolId())
                .questionText(req.getQuestionText())
                .questionType(req.getQuestionType())
                .difficulty(req.getDifficulty())
                .points(req.getPoints() != null ? req.getPoints() : defaultPoints(req.getDifficulty()))
                .explanation(req.getExplanation())
                .build();
        question = questionRepo.save(question);

        // 4. Save answers
        List<Answer> savedAnswers = saveAnswers(question.getId(), req.getAnswers());
        return toResponse(question, savedAnswers);
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> findByPool(String poolId) {
        poolService.getPoolOrThrow(poolId);
        return questionRepo.findByPoolId(poolId).stream()
                .map(q -> toResponse(q, answerRepo.findByQuestionIdOrderByDisplayOrder(q.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> findByPoolAndDifficulty(String poolId, Difficulty difficulty) {
        return questionRepo.findByPoolIdAndDifficultyAndIsActiveTrue(poolId, difficulty).stream()
                .map(q -> toResponse(q, answerRepo.findByQuestionIdOrderByDisplayOrder(q.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public QuestionResponse findById(String id) {
        Question q = getOrThrow(id);
        return toResponse(q, answerRepo.findByQuestionIdOrderByDisplayOrder(id));
    }

    public QuestionResponse update(String id, QuestionRequest req) {
        Question question = getOrThrow(id);
        validateAnswers(req.getQuestionType(), req.getAnswers());

        question.setQuestionText(req.getQuestionText());
        question.setQuestionType(req.getQuestionType());
        question.setDifficulty(req.getDifficulty());
        question.setPoints(req.getPoints() != null ? req.getPoints() : defaultPoints(req.getDifficulty()));
        question.setExplanation(req.getExplanation());
        question = questionRepo.save(question);

        // Replace all answers
        answerRepo.deleteByQuestionId(id);
        List<Answer> updatedAnswers = saveAnswers(id, req.getAnswers());
        return toResponse(question, updatedAnswers);
    }

    public void delete(String id) {
        getOrThrow(id);
        answerRepo.deleteByQuestionId(id);
        questionRepo.deleteById(id);
    }

    public void toggleActive(String id) {
        Question q = getOrThrow(id);
        q.setIsActive(!q.getIsActive());
        questionRepo.save(q);
    }

    // ── Bulk create questions for a pool (admin convenience) ───────────────────

    public List<QuestionResponse> bulkCreate(List<QuestionRequest> requests) {
        return requests.stream().map(this::create).toList();
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private void validateAnswers(QuestionType type, List<AnswerRequest> answers) {
        long correctCount = answers.stream().filter(AnswerRequest::getIsCorrect).count();
        if (type == QuestionType.MCQ) {
            if (correctCount != 1) {
                throw new IllegalArgumentException(
                        "MCQ must have exactly 1 correct answer, found: " + correctCount);
            }
        } else if (type == QuestionType.MULTIPLE_CORRECT) {
            if (correctCount < 2) {
                throw new IllegalArgumentException(
                        "MULTIPLE_CORRECT must have at least 2 correct answers, found: " + correctCount);
            }
        }
        if (answers.size() < 2) {
            throw new IllegalArgumentException("A question must have at least 2 answer options");
        }
    }

    private List<Answer> saveAnswers(String questionId, List<AnswerRequest> requests) {
        List<Answer> answers = new ArrayList<>();
        for (int i = 0; i < requests.size(); i++) {
            AnswerRequest req = requests.get(i);
            Answer a = Answer.builder()
                    .questionId(questionId)
                    .answerText(req.getAnswerText())
                    .isCorrect(req.getIsCorrect())
                    .displayOrder(req.getDisplayOrder() != null ? req.getDisplayOrder() : i)
                    .build();
            answers.add(answerRepo.save(a));
        }
        return answers;
    }

    private int defaultPoints(Difficulty difficulty) {
        return switch (difficulty) {
            case EASY   -> 1;
            case MEDIUM -> 2;
            case HARD   -> 3;
        };
    }

    public Question getOrThrow(String id) {
        return questionRepo.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Question not found: " + id));
    }

    public QuestionResponse toResponse(Question q, List<Answer> answers) {
        return QuestionResponse.builder()
                .id(q.getId())
                .poolId(q.getPoolId())
                .questionText(q.getQuestionText())
                .questionType(q.getQuestionType())
                .difficulty(q.getDifficulty())
                .points(q.getPoints())
                .explanation(q.getExplanation())
                .isActive(q.getIsActive())
                .createdAt(q.getCreatedAt())
                .updatedAt(q.getUpdatedAt())
                .answers(answers.stream().map(this::toAnswerResponse).toList())
                .build();
    }

    public AnswerResponse toAnswerResponse(Answer a) {
        return AnswerResponse.builder()
                .id(a.getId())
                .questionId(a.getQuestionId())
                .answerText(a.getAnswerText())
                .isCorrect(a.getIsCorrect())
                .displayOrder(a.getDisplayOrder())
                .build();
    }
}
