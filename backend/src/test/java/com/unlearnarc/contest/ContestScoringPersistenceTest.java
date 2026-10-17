package com.unlearnarc.contest;

import com.unlearnarc.contest.dto.SubmissionRequest;
import com.unlearnarc.contest.entity.*;
import com.unlearnarc.contest.repository.*;
import com.unlearnarc.contest.service.*;
import com.unlearnarc.user.entity.User;
import com.unlearnarc.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ContestScoringPersistenceTest {
    @Autowired ContestParticipationService service;
    @Autowired ContestRepository contests;
    @Autowired ContestProblemRepository problems;
    @Autowired ContestTestCaseRepository cases;
    @Autowired ContestParticipantRepository participants;
    @Autowired UserRepository users;
    @Autowired PayloadSigner signer;

    @Test void committedSubmissionAwardsUserAndPersistsCompletionWithoutDuplicates() {
        User user = users.save(User.builder().name("Contest learner")
                .email(UUID.randomUUID() + "@test.example").build());
        Contest contest = contests.save(Contest.builder().title("Scoring regression")
                .slug(UUID.randomUUID().toString()).status(Contest.ContestStatus.PUBLISHED).build());
        ContestProblem problem = problems.save(ContestProblem.builder().contestId(contest.getId())
                .title("Echo").statement("Echo stdin").difficulty(ContestProblem.Difficulty.EASY).maxPoints(100).build());
        ContestTestCase tc = cases.save(ContestTestCase.builder().problemId(problem.getId())
                .input("hello").expectedOutput("hello").build());
        var outcome = new SubmissionRequest.TestOutcome();
        outcome.setTestCaseId(tc.getId()); outcome.setInput(tc.getInput());
        outcome.setProducedOutput("hello");
        outcome.setSignature(signer.sign(user.getId(), problem.getId(), tc.getId(), tc.getInput()));
        var request = new SubmissionRequest();
        request.setProblemId(problem.getId()); request.setLanguage("python"); request.setResults(List.of(outcome));

        assertEquals(100, service.submit(contest.getId(), user.getId(), request).getScoreDelta());
        assertEquals(100L, users.findById(user.getId()).orElseThrow().getPoints());
        assertEquals(0, service.submit(contest.getId(), user.getId(), request).getScoreDelta());
        assertEquals(100L, users.findById(user.getId()).orElseThrow().getPoints());
        var participant = participants.findByContestIdAndUserId(contest.getId(), user.getId()).orElseThrow();
        assertEquals(100, participant.getTotalScore());
        assertEquals(1, participant.getSolvedCount());
        var progress = service.myProgress(user.getId());
        assertEquals(1, progress.size());
        assertTrue(progress.getFirst().completed());
        assertEquals(100, progress.getFirst().totalScore());
        assertEquals(java.util.Set.of(problem.getId()), progress.getFirst().solvedProblemIds());
        assertTrue(service.myProgress(UUID.randomUUID().toString()).isEmpty());
    }
}
