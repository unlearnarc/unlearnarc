package com.unlearnarc.search.core;

import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;

import java.util.Comparator;
import java.util.List;

/**
 * Shared helper that takes a fully-scored, filtered list of items and applies
 * sort + pagination, producing the final {@link SearchGroup}. Centralising this
 * keeps every {@link ResourceSearcher} tiny and consistent.
 */
public final class Pager {

    private Pager() {}

    public static SearchGroup paginate(SearchType type, SearchRequest req, List<SearchResultItem> scored) {
        // Drop zero-score hits only when an actual query was supplied.
        List<SearchResultItem> matched = req.hasQuery()
                ? scored.stream().filter(i -> i.getScore() > 0).toList()
                : scored;

        Comparator<SearchResultItem> cmp;
        if (req.sortByRelevance()) {
            cmp = Comparator.comparingDouble(SearchResultItem::getScore).reversed()
                    .thenComparing(i -> safe(i.getTitle()));
        } else {
            // Named sort: fall back to title ordering (searchers may re-sort meta themselves).
            cmp = Comparator.comparing((SearchResultItem i) -> safe(i.getTitle()));
            if (req.getDirection() != null && req.getDirection().isDescending()) {
                cmp = cmp.reversed();
            }
        }

        List<SearchResultItem> sorted = matched.stream().sorted(cmp).toList();

        int size = Math.max(1, req.getSize());
        int page = Math.max(0, req.getPage());
        int from = Math.min(page * size, sorted.size());
        int to = Math.min(from + size, sorted.size());
        List<SearchResultItem> pageItems = sorted.subList(from, to);

        return SearchGroup.builder()
                .type(type.name())
                .totalHits(sorted.size())
                .page(page)
                .size(size)
                .hasMore(to < sorted.size())
                .items(List.copyOf(pageItems))
                .build();
    }

    private static String safe(String s) {
        return s == null ? "" : s.toLowerCase();
    }
}
