package com.unlearnarc.search.searchers;

import com.unlearnarc.contest.entity.Contest;
import com.unlearnarc.contest.entity.ContestProblem;
import com.unlearnarc.contest.entity.ContestProblem.Difficulty;
import com.unlearnarc.contest.repository.ContestProblemRepository;
import com.unlearnarc.contest.repository.ContestRepository;
import com.unlearnarc.search.core.Pager;
import com.unlearnarc.search.core.ResourceSearcher;
import com.unlearnarc.search.core.SearchScoring;
import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Searches individual coding problems inside contests (LeetCode-style).
 *
 * Each hit resolves its parent contest (id + title) so the frontend can
 * deep-link to {@code /contests/{contestId}} and preselect the problem.
 * Supports an optional {@code difficulty} filter (EASY/MEDIUM/HARD).
 */
@Component
@RequiredArgsConstructor
public class ContestProblemSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;
    private static final int SNIPPET_LEN = 180;

    private final ContestProblemRepository problemRepository;
    private final ContestRepository contestRepository;

    @Override
    public SearchType type() {
        return SearchType.CONTEST_PROBLEM;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        Difficulty difficulty = parseDifficulty(req.getDifficulty());
        String q = req.normalizedQuery().toLowerCase();

        List<ContestProblem> rows =
                problemRepository.search(q, difficulty, PageRequest.of(0, FETCH_CAP));

        // Batch-resolve parent contests to avoid an N+1 lookup.
        Set<String> contestIds = rows.stream()
                .map(ContestProblem::getContestId)
                .collect(Collectors.toSet());
        Map<String, Contest> contests = contestRepository.findAllById(contestIds).stream()
                .collect(Collectors.toMap(Contest::getId, Function.identity(), (a, b) -> a));

        List<SearchResultItem> scored = rows.stream().map(p -> {
            Contest contest = contests.get(p.getContestId());
            double score = SearchScoring.scoreBest(req.normalizedQuery(),
                    p.getTitle(), 1.0,
                    p.getStatement(), 0.4,
                    p.getConstraints(), 0.3);
            Map<String, Object> meta = new HashMap<>();
            meta.put("contestId", p.getContestId());
            meta.put("contestTitle", contest == null ? null : contest.getTitle());
            meta.put("contestSlug", contest == null ? null : contest.getSlug());
            meta.put("problemId", p.getId());
            meta.put("difficulty", p.getDifficulty());
            meta.put("maxPoints", p.getMaxPoints());
            return SearchResultItem.builder()
                    .type(SearchType.CONTEST_PROBLEM.name())
                    .id(p.getId())
                    .title(p.getTitle())
                    .subtitle(subtitle(p, contest))
                    .snippet(snippet(p.getStatement()))
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.CONTEST_PROBLEM, req, scored);
    }

    private String subtitle(ContestProblem p, Contest contest) {
        String diff = p.getDifficulty() == null ? null : p.getDifficulty().name();
        String ctx = contest == null ? null : contest.getTitle();
        if (ctx != null && diff != null) return diff + " · " + ctx;
        return ctx != null ? ctx : diff;
    }

    private Difficulty parseDifficulty(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Difficulty.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    /** Statement is Markdown; strip the heaviest syntax for a readable preview. */
    private String snippet(String body) {
        if (body == null) return null;
        String clean = body.replaceAll("[#*`>_\\-]+", " ").replaceAll("\\s+", " ").strip();
        return clean.length() <= SNIPPET_LEN ? clean : clean.substring(0, SNIPPET_LEN) + "…";
    }
}
