package com.unlearnarc.search.searchers;

import com.unlearnarc.interview.entity.InterviewExperience;
import com.unlearnarc.interview.repository.InterviewExperienceRepository;
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

@Component
@RequiredArgsConstructor
public class InterviewExperienceSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;
    private static final int SNIPPET_LEN = 220;

    private final InterviewExperienceRepository repository;

    @Override
    public SearchType type() {
        return SearchType.INTERVIEW_EXPERIENCE;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        String q = req.normalizedQuery().toLowerCase();
        String company = (req.getCompany() == null || req.getCompany().isBlank())
                ? null : req.getCompany();

        List<InterviewExperience> rows =
                repository.search(q, company, req.isVerifiedOnly(), PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(e -> {
            // weight company/role higher than the long experience body
            double score = SearchScoring.scoreBest(req.normalizedQuery(),
                    e.getCompany(), 1.0,
                    e.getRole(), 0.9,
                    e.getCity(), 0.6,
                    e.getExperience(), 0.4);
            Map<String, Object> meta = new HashMap<>();
            meta.put("company", e.getCompany());
            meta.put("role", e.getRole());
            meta.put("city", e.getCity());
            meta.put("isPassed", e.getIsPassed());
            meta.put("isVerified", e.getIsVerified());
            meta.put("createdAt", e.getCreatedAt());
            return SearchResultItem.builder()
                    .type(SearchType.INTERVIEW_EXPERIENCE.name())
                    .id(e.getId())
                    .title(e.getCompany() + " — " + e.getRole())
                    .subtitle(e.getCity())
                    .snippet(snippet(e.getExperience()))
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.INTERVIEW_EXPERIENCE, req, scored);
    }

    private String snippet(String body) {
        if (body == null) return null;
        String clean = body.strip();
        return clean.length() <= SNIPPET_LEN ? clean : clean.substring(0, SNIPPET_LEN) + "…";
    }
}
