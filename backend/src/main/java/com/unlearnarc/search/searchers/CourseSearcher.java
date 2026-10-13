package com.unlearnarc.search.searchers;

import com.unlearnarc.course.entity.Course;
import com.unlearnarc.course.entity.Course.CourseLevel;
import com.unlearnarc.course.repository.CourseRepository;
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
public class CourseSearcher implements ResourceSearcher {

    /** Over-fetch cap so in-memory relevance ranking is meaningful without loading the whole table. */
    private static final int FETCH_CAP = 200;

    private final CourseRepository courseRepository;

    @Override
    public SearchType type() {
        return SearchType.COURSE;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        CourseLevel level = parseLevel(req.getLevel());
        String q = req.normalizedQuery().toLowerCase();

        List<Course> rows = courseRepository.search(q, level, PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(c -> {
            double score = SearchScoring.scoreBest(req.normalizedQuery(), c.getName(), 1.0);
            Map<String, Object> meta = new HashMap<>();
            meta.put("level", c.getLevel());
            meta.put("topicsCount", c.getTopicsCount());
            meta.put("totalTime", c.getTotalTime());
            return SearchResultItem.builder()
                    .type(SearchType.COURSE.name())
                    .id(c.getId())
                    .title(c.getName())
                    .subtitle(c.getLevel() == null ? null : c.getLevel().name())
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.COURSE, req, scored);
    }

    private CourseLevel parseLevel(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return CourseLevel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
