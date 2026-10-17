package com.unlearnarc.contest;

import com.unlearnarc.contest.dto.SubmissionRequest;
import com.unlearnarc.contest.entity.*;
import com.unlearnarc.contest.repository.*;
import com.unlearnarc.contest.service.*;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import com.unlearnarc.user.service.LeaderboardService;
import com.unlearnarc.user.service.StreakService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ContestScoringTest {
    @Mock ContestRepository contests;
    @Mock ContestProblemRepository problems;
    @Mock ContestTestCaseRepository cases;
    @Mock ContestParticipantRepository participants;
    @Mock ContestSubmissionRepository submissions;
    @Mock UserRepository users;
    @Mock OutputValidator validator;
    @Mock PayloadSigner signer;
    @Mock ContestMapper mapper;
    @Mock LeaderboardService leaderboard;
    @Mock StreakService streak;
    @InjectMocks ContestParticipationService service;
    ContestParticipant participant;
    List<ContestSubmission> history;
    SubmissionRequest request;

    @BeforeEach void setup() {
        participant = ContestParticipant.builder().contestId("contest").userId("user").build();
        history = new ArrayList<>();
        when(users.lockForContestScoring("user")).thenReturn(Optional.of(User.builder().id("user").build()));
        when(contests.findById("contest")).thenReturn(Optional.of(Contest.builder().id("contest")
                .title("Test").status(Contest.ContestStatus.PUBLISHED).build()));
        when(problems.findById("problem")).thenReturn(Optional.of(ContestProblem.builder()
                .id("problem").contestId("contest").maxPoints(100).build()));
        when(participants.findByContestIdAndUserId("contest", "user")).thenReturn(Optional.of(participant));
        when(cases.findByProblemIdOrderByDisplayOrder("problem")).thenReturn(List.of(
                ContestTestCase.builder().id("case").expectedOutput("yes").build()));
        when(submissions.findByContestIdAndUserIdAndProblemId("contest", "user", "problem"))
                .thenAnswer(i -> new ArrayList<>(history));
        when(submissions.save(any())).thenAnswer(i -> { ContestSubmission s = i.getArgument(0); history.add(s); return s; });
        when(signer.verify(any(), any(), any(), any(), any())).thenReturn(true);
        when(validator.matches(any(), any(), anyBoolean())).thenReturn(true);
        request = new SubmissionRequest();
        request.setProblemId("problem"); request.setLanguage("python");
        var outcome = new SubmissionRequest.TestOutcome();
        outcome.setTestCaseId("case"); outcome.setSignature("signed"); outcome.setInput("input"); outcome.setProducedOutput("yes");
        request.setResults(List.of(outcome));
    }

    @Test void firstAcceptanceAwardsPointsAndTracksSolvedProblem() {
        var response = service.submit("contest", "user", request);
        assertEquals(100, response.getScoreDelta());
        assertEquals(100, participant.getTotalScore());
        assertEquals(1, participant.getSolvedCount());
        verify(leaderboard).awardPoints("user", 100);
    }

    @Test void repeatAcceptanceDoesNotDuplicatePointsOrSolvedCount() {
        service.submit("contest", "user", request);
        var response = service.submit("contest", "user", request);
        assertEquals(0, response.getScoreDelta());
        assertEquals(100, participant.getTotalScore());
        assertEquals(1, participant.getSolvedCount());
        verify(leaderboard, times(1)).awardPoints("user", 100);
    }

    @Test void improvementAwardsOnlyDifferenceAndUsesVerdictForCompletion() {
        history.add(ContestSubmission.builder().score(100).verdict(ContestSubmission.Verdict.PARTIAL).build());
        participant.setTotalScore(100);
        var response = service.submit("contest", "user", request);
        assertEquals(0, response.getScoreDelta());
        assertEquals(1, participant.getSolvedCount());
        verifyNoInteractions(leaderboard);
    }

    @Test void partialHistoryAwardsOnlyTheImprovement() {
        history.add(ContestSubmission.builder().score(40).verdict(ContestSubmission.Verdict.PARTIAL).build());
        participant.setTotalScore(40);
        assertEquals(60, service.submit("contest", "user", request).getScoreDelta());
        assertEquals(100, participant.getTotalScore());
        verify(leaderboard).awardPoints("user", 60);
    }
}
