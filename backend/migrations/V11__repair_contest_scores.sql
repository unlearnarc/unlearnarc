-- Repair participant totals affected by scoring history being read after insertion.
-- Run once during deployment after a database backup. No submissions are modified.
-- Award only the missing contest portion; preserve existing quiz/admin points.
START TRANSACTION;

UPDATE `user` u
JOIN (
    SELECT p.user_id,
           SUM(GREATEST(0, COALESCE(scores.correct_total, 0) - p.total_score)) AS missing_points
    FROM contest_participant p
    LEFT JOIN (
        SELECT contest_id, user_id, SUM(best_score) AS correct_total
        FROM (
            SELECT contest_id, user_id, problem_id, MAX(score) AS best_score
            FROM contest_submission
            GROUP BY contest_id, user_id, problem_id
        ) best
        GROUP BY contest_id, user_id
    ) scores ON scores.contest_id = p.contest_id AND scores.user_id = p.user_id
    GROUP BY p.user_id
) repair ON repair.user_id = u.id
SET u.points = COALESCE(u.points, 0) + repair.missing_points;

UPDATE contest_participant p
LEFT JOIN (
    SELECT contest_id, user_id, SUM(best_score) AS correct_total,
           SUM(solved) AS correct_solved, MAX(last_accepted_at) AS last_accepted_at
    FROM (
        SELECT contest_id, user_id, problem_id, MAX(score) AS best_score,
               MAX(CASE WHEN verdict = 'ACCEPTED' THEN 1 ELSE 0 END) AS solved,
               MAX(CASE WHEN verdict = 'ACCEPTED' THEN submitted_at ELSE NULL END) AS last_accepted_at
        FROM contest_submission
        GROUP BY contest_id, user_id, problem_id
    ) best
    GROUP BY contest_id, user_id
) repair ON repair.contest_id = p.contest_id AND repair.user_id = p.user_id
SET p.total_score = COALESCE(repair.correct_total, 0),
    p.solved_count = COALESCE(repair.correct_solved, 0),
    p.last_accepted_at = repair.last_accepted_at;

COMMIT;
