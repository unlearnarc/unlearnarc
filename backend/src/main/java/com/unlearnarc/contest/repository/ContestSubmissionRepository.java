package com.unlearnarc.contest.repository;

import com.unlearnarc.contest.entity.ContestSubmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ContestSubmissionRepository extends JpaRepository<ContestSubmission, String> {

    List<ContestSubmission> findByContestIdAndUserIdOrderBySubmittedAtDesc(String contestId, String userId);

    List<ContestSubmission> findByContestIdAndUserIdAndProblemIdOrderBySubmittedAtDesc(
            String contestId, String userId, String problemId);

    /** Best score a user already achieved on a problem (to compute score deltas). */
    List<ContestSubmission> findByContestIdAndUserIdAndProblemId(
            String contestId, String userId, String problemId);

    long countByContestIdAndUserIdAndProblemId(String contestId, String userId, String problemId);

    List<ContestSubmission> findByUserId(String userId);
}
