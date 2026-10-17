# Contest score repair

The submission flow previously read the best score after saving the current attempt. JPA auto-flushing made the current score appear in the history, so participant totals and user points were not incremented and accepted problems were not counted.

Deploy the scoring fix, back up the MySQL database, and run `V11__repair_contest_scores.sql` during a maintenance window with submissions and the nightly leaderboard recomputation paused. This repository does not automatically execute these SQL migrations.

The repair derives best scores and accepted counts from stored submissions, adds the missing participant-score difference to user points, and replaces participant aggregates. It does not change submission records or quiz points. Running it again without intervening data changes adds no further points. Review custom/manual point adjustments before applying it. The script has not been executed against a live database.

Completion is derived from accepted submissions for every currently active problem in a non-empty contest. Partial scores do not mark a problem solved, even if rounding yields the maximum score. Progress is scoped to the signed-in user; the temporary anonymous fallback has been removed, so contest API requests now require authentication.
