package com.unlearnarc.contest.repository;

import com.unlearnarc.contest.entity.ContestTestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestTestCaseRepository extends JpaRepository<ContestTestCase, String> {

    List<ContestTestCase> findByProblemIdOrderByDisplayOrder(String problemId);

    /** Public (sample) cases shipped to the client in full. */
    List<ContestTestCase> findByProblemIdAndIsHiddenFalseOrderByDisplayOrder(String problemId);

    /** Hidden cases used for authoritative grading (expected output kept server-side). */
    List<ContestTestCase> findByProblemIdAndIsHiddenTrueOrderByDisplayOrder(String problemId);

    void deleteByProblemId(String problemId);
}
