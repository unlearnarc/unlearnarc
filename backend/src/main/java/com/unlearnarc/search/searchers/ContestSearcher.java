package com.unlearnarc.search.searchers;

import com.unlearnarc.contest.entity.Contest;
import com.unlearnarc.contest.entity.Contest.ContestStatus;
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

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class ContestSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;
    private static final int SNIPPET_LEN = 200;

    private final ContestRepository contestRepository;

    @Override
    public SearchType type() {
        return SearchType.CONTEST;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        ContestStatus status = parseStatus(req.getStatus());
        String q = req.normalizedQuery().toLowerCase();

        List<Contest> rows = contestRepository.search(q, status, PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(c -> {
            double score = SearchScoring.scoreBest(req.normalizedQuery(),
                    c.getTitle(), 1.0,
                    c.getSlug(), 0.8,
                    c.getDescription(), 0.4);
            Map<String, Object> meta = new HashMap<>();
            meta.put("slug", c.getSlug());
            meta.put("status", c.getStatus());
            meta.put("phase", phase(c));
            meta.put("startTime", c.getStartTime());
            meta.put("endTime", c.getEndTime());
            return SearchResultItem.builder()
                    .type(SearchType.CONTEST.name())
                    .id(c.getId())
                    .title(c.getTitle())
                    .subtitle(phase(c))
                    .snippet(snippet(c.getDescription()))
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.CONTEST, req, scored);
    }

    private ContestStatus parseStatus(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return ContestStatus.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }

    /** DRAFT/ARCHIVED pass through; PUBLISHED resolves to UPCOMING / RUNNING / ENDED by time window. */
    private String phase(Contest c) {
        if (c.getStatus() != ContestStatus.PUBLISHED) {
            return c.getStatus() == null ? null : c.getStatus().name();
        }
        Instant now = Instant.now();
        if (c.getStartTime() != null && now.isBefore(c.getStartTime())) return "UPCOMING";
        if (c.getEndTime() != null && now.isAfter(c.getEndTime())) return "ENDED";
        return "RUNNING";
    }

    private String snippet(String body) {
        if (body == null) return null;
        String clean = body.strip();
        return clean.length() <= SNIPPET_LEN ? clean : clean.substring(0, SNIPPET_LEN) + "…";
    }
}
