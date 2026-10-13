package com.unlearnarc.search.searchers;

import com.unlearnarc.search.core.Pager;
import com.unlearnarc.search.core.ResourceSearcher;
import com.unlearnarc.search.core.SearchScoring;
import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchResultItem;
import com.unlearnarc.search.dto.SearchType;
import com.unlearnarc.skill.entity.Skill;
import com.unlearnarc.skill.entity.Skill.SkillLevel;
import com.unlearnarc.skill.repository.SkillRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class SkillSearcher implements ResourceSearcher {

    private static final int FETCH_CAP = 200;

    private final SkillRepository skillRepository;

    @Override
    public SearchType type() {
        return SearchType.SKILL;
    }

    @Override
    public SearchGroup search(SearchRequest req) {
        SkillLevel level = parseLevel(req.getLevel());
        String q = req.normalizedQuery().toLowerCase();

        List<Skill> rows = skillRepository.search(q, level, PageRequest.of(0, FETCH_CAP));

        List<SearchResultItem> scored = rows.stream().map(s -> {
            double score = SearchScoring.scoreBest(req.normalizedQuery(), s.getName(), 1.0);
            Map<String, Object> meta = new HashMap<>();
            meta.put("level", s.getLevel());
            return SearchResultItem.builder()
                    .type(SearchType.SKILL.name())
                    .id(s.getId())
                    .title(s.getName())
                    .subtitle(s.getLevel() == null ? null : s.getLevel().name())
                    .score(score)
                    .meta(meta)
                    .build();
        }).toList();

        return Pager.paginate(SearchType.SKILL, req, scored);
    }

    private SkillLevel parseLevel(String raw) {
        if (raw == null || raw.isBlank()) return null;
        try {
            return SkillLevel.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ignored) {
            return null;
        }
    }
}
