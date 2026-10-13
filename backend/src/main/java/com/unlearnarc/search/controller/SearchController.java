package com.unlearnarc.search.controller;

import com.unlearnarc.common.ApiResponse;
import com.unlearnarc.search.dto.GlobalSearchResponse;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchType;
import com.unlearnarc.search.service.GlobalSearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Unified global search across every resource (course, topic, skill, domain,
 * interview experience, company, contest).
 *
 * <pre>
 * GET /api/v1/search?q=graph
 *     → searches EVERYTHING, grouped + flat ranked results
 *
 * GET /api/v1/search?q=graph&types=course,topic
 *     → only those types
 *
 * GET /api/v1/search?q=binary&types=course&level=ADVANCED&page=0&size=10
 *     → filtered + paginated
 *
 * GET /api/v1/search?q=google&types=interview_experience&company=Google
 * GET /api/v1/search?q=sort&types=contest&status=PUBLISHED&sort=relevance
 * </pre>
 *
 * Public (read-only). Fine-grained visibility (e.g. unverified interview posts)
 * is controlled by {@code verifiedOnly}, which admins may set to false.
 */
@RestController
@RequestMapping("/api/v1/search")
@RequiredArgsConstructor
public class SearchController {

    private final GlobalSearchService searchService;

    @GetMapping
    public ResponseEntity<ApiResponse<GlobalSearchResponse>> search(
            @RequestParam(value = "q", required = false) String q,
            @RequestParam(value = "types", required = false) String types,
            @RequestParam(value = "level", required = false) String level,
            @RequestParam(value = "company", required = false) String company,
            @RequestParam(value = "courseId", required = false) String courseId,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "difficulty", required = false) String difficulty,
            @RequestParam(value = "verifiedOnly", defaultValue = "true") boolean verifiedOnly,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "20") int size,
            @RequestParam(value = "sort", defaultValue = "relevance") String sort,
            @RequestParam(value = "direction", defaultValue = "DESC") String direction,
            @RequestParam(value = "flatPage", defaultValue = "0") int flatPage,
            @RequestParam(value = "flatSize", defaultValue = "20") int flatSize) {

        SearchRequest req = new SearchRequest();
        req.setQuery(q);
        req.setTypes(SearchType.parseList(types));   // null/blank → all types
        req.setLevel(level);
        req.setCompany(company);
        req.setCourseId(courseId);
        req.setStatus(status);
        req.setDifficulty(difficulty);
        req.setVerifiedOnly(verifiedOnly);
        req.setPage(page);
        req.setSize(clampSize(size));
        req.setSort(sort);
        req.setDirection(parseDirection(direction));

        GlobalSearchResponse result =
                searchService.search(req, flatPage, clampSize(flatSize));

        return ResponseEntity.ok(ApiResponse.ok(result, "Search completed"));
    }

    private int clampSize(int size) {
        if (size < 1) return 1;
        return Math.min(size, 100); // hard cap to protect the DB
    }

    private Sort.Direction parseDirection(String raw) {
        try {
            return Sort.Direction.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return Sort.Direction.DESC;
        }
    }
}
