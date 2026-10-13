package com.unlearnarc.search.service;

import com.unlearnarc.search.core.ResourceSearcher;
import com.unlearnarc.search.dto.GlobalSearchResponse;
import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;

/**
 * Orchestrates global search across every registered {@link ResourceSearcher}.
 *
 * Design goals the user asked for:
 *   - "search all the places" by default, or only the filtered subset of types
 *   - fast → each type is searched in parallel (virtual threads)
 *   - easy to extend → drop in a new ResourceSearcher @Component, nothing else
 *   - pagination / sort / filters handled uniformly per type
 */
@Slf4j
@Service
public class GlobalSearchService {

    private final Map<SearchType, ResourceSearcher> searchers = new EnumMap<>(SearchType.class);

    /** Spring injects every ResourceSearcher bean; we index them by type. */
    public GlobalSearchService(List<ResourceSearcher> all) {
        for (ResourceSearcher s : all) {
            searchers.put(s.type(), s);
        }
        log.info("[SEARCH] Registered {} searchers: {}", searchers.size(), searchers.keySet());
    }

    public GlobalSearchResponse search(SearchRequest req, int flatPage, int flatSize) {
        long start = System.currentTimeMillis();

        Set<SearchType> requested = (req.getTypes() == null || req.getTypes().isEmpty())
                ? searchers.keySet()
                : req.getTypes();

        // Fan out: one async task per requested type.
        List<CompletableFuture<SearchGroup>> futures = requested.stream()
                .map(searchers::get)
                .filter(java.util.Objects::nonNull)
                .map(searcher -> CompletableFuture.supplyAsync(() -> {
                    try {
                        return searcher.search(req);
                    } catch (Exception ex) {
                        log.warn("[SEARCH] {} searcher failed: {}", searcher.type(), ex.getMessage());
                        return SearchGroup.builder()
                                .type(searcher.type().name())
                                .totalHits(0).page(req.getPage()).size(req.getSize())
                                .hasMore(false).items(List.of())
                                .build();
                    }
                }))
                .toList();

        List<SearchGroup> groups = futures.stream()
                .map(CompletableFuture::join)
                .sorted(Comparator.comparingLong(SearchGroup::getTotalHits).reversed())
                .toList();

        long totalHits = groups.stream().mapToLong(SearchGroup::getTotalHits).sum();

        // Build a single relevance-ranked, cross-type stream, then page it.
        List<SearchResultItem> merged = groups.stream()
                .flatMap(g -> g.getItems().stream())
                .sorted(Comparator.comparingDouble(SearchResultItem::getScore).reversed()
                        .thenComparing(i -> i.getTitle() == null ? "" : i.getTitle().toLowerCase()))
                .toList();

        int fSize = Math.max(1, flatSize);
        int fPage = Math.max(0, flatPage);
        int from = Math.min(fPage * fSize, merged.size());
        int to = Math.min(from + fSize, merged.size());
        List<SearchResultItem> flat = List.copyOf(merged.subList(from, to));

        return GlobalSearchResponse.builder()
                .query(req.normalizedQuery())
                .totalHits(totalHits)
                .tookMs(System.currentTimeMillis() - start)
                .groups(groups)
                .flat(flat)
                .build();
    }
}
