package com.unlearnarc.contest.service;

import com.unlearnarc.contest.dto.*;
import com.unlearnarc.contest.entity.Contest;
import com.unlearnarc.contest.entity.ContestProblem;
import com.unlearnarc.contest.entity.ContestTestCase;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

/** Hand-written mappers (entities use String PKs + hidden-field filtering). */
@Component
public class ContestMapper {

    public ContestResponse toContestResponse(Contest c, Long problemCount, Long participantCount) {
        return ContestResponse.builder()
                .id(c.getId())
                .title(c.getTitle())
                .slug(c.getSlug())
                .description(c.getDescription())
                .status(c.getStatus())
                .visibility(c.getVisibility())
                .startTime(c.getStartTime())
                .endTime(c.getEndTime())
                .durationMinutes(c.getDurationMinutes())
                .allowedLanguages(c.getAllowedLanguages())
                .wrongSubmissionPenalty(c.getWrongSubmissionPenalty())
                .createdBy(c.getCreatedBy())
                .createdAt(c.getCreatedAt())
                .problemCount(problemCount)
                .participantCount(participantCount)
                .phase(computePhase(c))
                .build();
    }

    /** STUDENT view — hidden expected outputs stripped, hidden count exposed. */
    public ContestProblemResponse toStudentProblem(ContestProblem p, List<ContestTestCase> allCases) {
        List<ContestProblemResponse.PublicTestCase> samples = allCases.stream()
                .filter(tc -> !tc.getIsHidden())
                .map(tc -> ContestProblemResponse.PublicTestCase.builder()
                        .id(tc.getId())
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .displayOrder(tc.getDisplayOrder())
                        .build())
                .toList();
        int hiddenCount = (int) allCases.stream().filter(ContestTestCase::getIsHidden).count();

        return ContestProblemResponse.builder()
                .id(p.getId())
                .contestId(p.getContestId())
                .title(p.getTitle())
                .statement(p.getStatement())
                .constraints(p.getConstraints())
                .difficulty(p.getDifficulty())
                .maxPoints(p.getMaxPoints())
                .starterCodeJson(p.getStarterCodeJson())
                .harnessType(p.getHarnessType())
                .timeLimitMs(p.getTimeLimitMs())
                .displayOrder(p.getDisplayOrder())
                .sampleTestCases(samples)
                .hiddenTestCount(hiddenCount)
                .build();
    }

    public ContestProblemAdminResponse toProblemAdminResponse(ContestProblem p, List<ContestTestCase> cases) {
        List<ContestProblemAdminResponse.TestCaseAdminView> views = cases.stream()
                .map(tc -> ContestProblemAdminResponse.TestCaseAdminView.builder()
                        .id(tc.getId())
                        .input(tc.getInput())
                        .expectedOutput(tc.getExpectedOutput())
                        .isHidden(tc.getIsHidden())
                        .weight(tc.getWeight())
                        .strictMatch(tc.getStrictMatch())
                        .displayOrder(tc.getDisplayOrder())
                        .build())
                .toList();
        return ContestProblemAdminResponse.builder()
                .id(p.getId())
                .contestId(p.getContestId())
                .title(p.getTitle())
                .statement(p.getStatement())
                .constraints(p.getConstraints())
                .difficulty(p.getDifficulty())
                .maxPoints(p.getMaxPoints())
                .starterCodeJson(p.getStarterCodeJson())
                .harnessType(p.getHarnessType())
                .timeLimitMs(p.getTimeLimitMs())
                .displayOrder(p.getDisplayOrder())
                .isActive(p.getIsActive())
                .testCases(views)
                .build();
    }

    private String computePhase(Contest c) {
        if (c.getStatus() == Contest.ContestStatus.DRAFT)    return "DRAFT";
        if (c.getStatus() == Contest.ContestStatus.ARCHIVED) return "ENDED";
        Instant now = Instant.now();
        if (c.getStartTime() != null && now.isBefore(c.getStartTime())) return "UPCOMING";
        if (c.getEndTime()   != null && now.isAfter(c.getEndTime()))    return "ENDED";
        return "RUNNING";
    }
}
