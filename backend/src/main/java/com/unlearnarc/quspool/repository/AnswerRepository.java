package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.Answer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AnswerRepository extends JpaRepository<Answer, String> {

    List<Answer> findByQuestionIdOrderByDisplayOrder(String questionId);

    List<Answer> findByQuestionIdAndIsCorrectTrue(String questionId);

    void deleteByQuestionId(String questionId);
}
