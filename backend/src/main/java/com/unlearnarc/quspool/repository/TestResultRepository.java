package com.unlearnarc.quspool.repository;

import com.unlearnarc.quspool.entity.TestResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestResultRepository extends JpaRepository<TestResult, String> {

    List<TestResult> findByIdIn(List<String> ids);

    @org.springframework.data.jpa.repository.Query("""
            SELECT r FROM TestResult r WHERE r.id IN
              (SELECT a.testId FROM UserTestAttempt a WHERE a.userId = :userId)
            """)
    List<TestResult> findForLearner(@org.springframework.data.repository.query.Param("userId") String userId);
}
