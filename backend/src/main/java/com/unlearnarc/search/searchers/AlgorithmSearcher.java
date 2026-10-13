package com.unlearnarc.search.searchers;

import com.unlearnarc.algoviz.entity.Algorithm;
import com.unlearnarc.algoviz.entity.Algorithm.Difficulty;
import com.unlearnarc.algoviz.repository.AlgorithmRepository;
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

/**
 * Searches algorithm visualizers (the algoviz catalog).
 *
 * Students only see published algorithms; the {@code verifiedOnly} flag is
 * reused as the publish gate (admins can pass {@code verifiedOnly=false} to
 * include drafts). Supports an optional {@code difficulty} filter.
 */
@Component
@RequiredArgsConstructor
public class AlgorithmSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;
    private static final int SNIPPET_LEN = 180;

    private final AlgorithmRepository algorithmRepository;

    @Override
    public SearchType type() {
        return SearchType.ALGORITHM;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        Difficulty difficulty = parseDifficulty(req.getDifficulty());
        String q = req.normalizedQuery().toLowerCase();

        // verifiedOnly (default true) → only published algorithms for students.
        List<Algorithm> rows =
                algorithmRepository.search(q, difficulty, req.isVerifiedOnly(), PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(a -> {
            double score = SearchScoring.scoreBest(req.normalizedQuery(),
                    a.getTitle(), 1.0,
                    a.getSlug(), 0.8,
                    a.getCategory(), 0.6,
                    a.getSummary(), 0.4);
            Map<String, Object> meta = new HashMap<>();
            meta.put("slug", a.getSlug());
            meta.put("category", a.getCategory());
            meta.put("difficulty", a.getDifficulty());
            meta.put("visualizer", a.getVisualizer());
            meta.put("published", a.getIsPublished());
            return SearchResultItem.builder()
                    .type(SearchType.ALGORITHM.name())
                    .id(a.getId())
                    .title(a.getTitle())
                    .subtitle(subtitle(a))
                    .snippet(snippet(a.getSummary()))
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.ALGORITHM, req, scored);
    }

    private String subtitle(Algorithm a) {
        String diff = a.getDifficulty() == null ? null : a.getDifficulty().name();
        if (a.getCategory() != null && diff != null) return a.getCategory() + " · " + diff;
        return a.getCategory() != null ? a.getCategory() : diff;
    }

    private Difficulty parseDifficulty(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return Difficulty.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    private String snippet(String body) {
        if (body == null) return null;
        String clean = body.strip();
        return clean.length() <= SNIPPET_LEN ? clean : clean.substring(0, SNIPPET_LEN) + "…";
    }
}
