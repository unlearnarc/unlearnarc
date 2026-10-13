package com.unlearnarc.contest.repository;

import com.unlearnarc.contest.entity.ContestParticipant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ContestParticipantRepository extends JpaRepository<ContestParticipant, String> {

    Optional<ContestParticipant> findByContestIdAndUserId(String contestId, String userId);

    boolean existsByContestIdAndUserId(String contestId, String userId);

    /** Leaderboard: highest score first, earliest last-accepted as tiebreak, lowest penalty. */
    List<ContestParticipant> findByContestIdOrderByTotalScoreDescPenaltyAscLastAcceptedAtAsc(String contestId);

    long countByContestId(String contestId);
}
