package com.unlearnarc.contest.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

/**
 * A single test case for a {@link ContestProblem}.
 *
 * SECURITY MODEL (client-side execution):
 *   - PUBLIC  (isHidden=false): sample case. input + expectedOutput are shipped
 *     to the client so the student can test & see expectations.
 *   - HIDDEN  (isHidden=true):  only the INPUT is shipped to the client runner
 *     (so it can produce an output). The expectedOutput stays server-side and
 *     is used to re-validate the output the client reports. The client never
 *     sees the hidden expected output, so it cannot fabricate a pass.
 *
 * Output matching is normalised (trim trailing whitespace per line + trim
 * trailing newlines) unless {@code strictMatch} is true.
 */
@Entity
@Table(name = "contest_test_case", indexes = {
        @Index(name = "idx_ctc_problem", columnList = "problem_id"),
        @Index(name = "idx_ctc_hidden",  columnList = "problem_id, is_hidden")
})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ContestTestCase {

    @Id
    @Column(name = "id", updatable = false, nullable = false, columnDefinition = "VARCHAR(36)")
    @Builder.Default
    private String id = UUID.randomUUID().toString();

    @Column(name = "problem_id", nullable = false, columnDefinition = "VARCHAR(36)")
    private String problemId;

    /** Raw stdin (STDIN_STDOUT) or JSON args array (FUNCTION_RETURN). */
    @Column(name = "input", nullable = false, columnDefinition = "LONGTEXT")
    private String input;

    /** Expected stdout / expected JSON return value. NEVER exposed when hidden. */
    @Column(name = "expected_output", nullable = false, columnDefinition = "LONGTEXT")
    private String expectedOutput;

    /** true = hidden grading case; false = public sample case. */
    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private Boolean isHidden = true;

    /** Points this case contributes to the problem's score. */
    @Column(name = "weight", nullable = false)
    @Builder.Default
    private Integer weight = 1;

    /** Exact string compare when true; normalised compare when false. */
    @Column(name = "strict_match", nullable = false)
    @Builder.Default
    private Boolean strictMatch = false;

    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private Integer displayOrder = 0;
}
