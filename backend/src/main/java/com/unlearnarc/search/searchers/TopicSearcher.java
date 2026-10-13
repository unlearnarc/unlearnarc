package com.unlearnarc.search.searchers;

import com.unlearnarc.search.core.Pager;
import com.unlearnarc.search.core.ResourceSearcher;
import com.unlearnarc.search.core.SearchScoring;
import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;
import com.unlearnarc.topic.entity.Topic;
import com.unlearnarc.topic.entity.Topic.TopicLevel;
import com.unlearnarc.topic.repository.TopicRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class TopicSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;

    private final TopicRepository topicRepository;

    @Override
    public SearchType type() {
        return SearchType.TOPIC;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        TopicLevel level = parseLevel(req.getLevel());
        String courseId = (req.getCourseId() == null || req.getCourseId().isBlank())
                ? null : req.getCourseId();
        String q = req.normalizedQuery().toLowerCase();

        List<Topic> rows = topicRepository.search(q, level, courseId, PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(t -> {
            double score = SearchScoring.scoreBest(req.normalizedQuery(), t.getName(), 1.0);
            Map<String, Object> meta = new HashMap<>();
            meta.put("level", t.getLevel());
            meta.put("courseId", t.getCourseId());
            meta.put("topicOrder", t.getTopicOrder());
            return SearchResultItem.builder()
                    .type(SearchType.TOPIC.name())
                    .id(t.getId())
                    .title(t.getName())
                    .subtitle(t.getLevel() == null ? null : t.getLevel().name())
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.TOPIC, req, scored);
    }

    private TopicLevel parseLevel(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return TopicLevel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
