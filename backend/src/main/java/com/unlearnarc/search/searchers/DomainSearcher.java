package com.unlearnarc.search.searchers;

import com.unlearnarc.domain.entity.Domain;
import com.unlearnarc.domain.repository.DomainRepository;
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

import java.util.List;

@Component
@RequiredArgsConstructor
public class DomainSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;

    private final DomainRepository domainRepository;

    @Override
    public SearchType type() {
        return SearchType.DOMAIN;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        String q = req.normalizedQuery().toLowerCase();
        List<Domain> rows = domainRepository.search(q, PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(d ->
                SearchResultItem.builder()
                        .type(SearchType.DOMAIN.name())
                        .id(d.getId())
                        .title(d.getName())
                        .score(SearchScoring.scoreBest(req.normalizedQuery(), d.getName(), 1.0))
                        .build()
        ).toList();

        return Pager.paginate(SearchType.DOMAIN, req, scored);
    }
}
