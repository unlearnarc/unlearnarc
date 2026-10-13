package com.unlearnarc.search.core;

import com.unlearnarc.search.dto.SearchGroup;
import com.unlearnarc.search.dto.SearchRequest;
import com.unlearnarc.search.dto.SearchType;

/**
 * Strategy interface — one implementation per searchable resource type.
 *
 * The orchestrating {@link com.unlearnarc.search.service.GlobalSearchService}
 * discovers all beans implementing this interface and dispatches the request to
 * the ones whose {@link #type()} is requested. Adding a brand-new searchable
 * resource is as simple as dropping in a new {@code @Component} that implements
 * this interface — no changes to the orchestrator required.
 */
public interface ResourceSearcher {

    /** The resource type this searcher handles. */
    SearchType type();

    /**
     * Execute the search for this type and return a paged, ranked group.
     * Implementations should respect {@code request.page/size/sort} and apply
     * any type-relevant filters (level, company, courseId, status...).
     */
    SearchGroup search(SearchRequest request);
}
