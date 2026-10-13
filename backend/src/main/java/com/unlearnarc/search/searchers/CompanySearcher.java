package com.unlearnarc.search.searchers;

import com.unlearnarc.interview.repository.InterviewExperienceRepository;
import com.unlearnarc.search.core.Pager;
import com.unlearnarc.search.core.ResourceSearcher;
import com.unlearnarc.search.core.SearchScoring;
import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * COMPANY is a virtual resource: there is no Company table. We derive distinct
 * company names from {@code interview_experience}. The company id IS its name
 * (companies have no primary key), so clients can pivot to
 * {@code ?company=<name>} on the interview-experience feed.
 */
@Component
@RequiredArgsConstructor
public class CompanySearcher implements ResourceSearcher {

    private final InterviewExperienceRepository repository;

    @Override
    public SearchType type() {
        return SearchType.COMPANY;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        String q = req.normalizedQuery().toLowerCase();
        List<String> companies = repository.searchCompanies(q, req.isVerifiedOnly());

        List<SearchResultItem> scored = companies.stream()
                .filter(c -> c != null && !c.isBlank())
                .map(name -> SearchResultItem.builder()
                        .type(SearchType.COMPANY.name())
                        .id(name)      // name is the identifier for the virtual company
                        .title(name)
                        .score(SearchScoring.scoreBest(req.normalizedQuery(), name, 1.0))
                        .build())
                .toList();

        return Pager.paginate(SearchType.COMPANY, req, scored);
    }
}
