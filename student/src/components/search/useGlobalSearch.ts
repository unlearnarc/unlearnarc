import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { searchAPI, type SearchParams } from '../../api/endpoints';
import type { GlobalSearchResponse } from './types';

/* =============================================================================
   useGlobalSearch — the single data hook powering every search surface
   (the global TopBar, the full SearchPanel, and any page-scoped search box).

   It debounces the query term, calls the unified `/search` backend endpoint
   through react-query (so results are cached + deduped), and returns a tidy
   { data, isFetching, ... } shape.

   `baseParams` lets a caller lock in page-specific filters — e.g. the
   InterviewExperiences page passes { types: ['INTERVIEW_EXPERIENCE','COMPANY'] }
   so the exact same component only searches that slice.
   ============================================================================= */

interface Options {
  /** The live search term (will be debounced internally). */
  term: string;
  /** Filters/paging merged into every request (page-scoped search passes these). */
  baseParams?: Omit<SearchParams, 'q'>;
  /** Debounce delay in ms. Default 250. */
  debounceMs?: number;
  /** Don't fire until the term has at least this many chars. Default 1. */
  minChars?: number;
  /** Master switch — set false to pause (e.g. panel closed). Default true. */
  enabled?: boolean;
}

export function useGlobalSearch({
  term,
  baseParams,
  debounceMs = 250,
  minChars = 1,
  enabled = true,
}: Options) {
  const [debounced, setDebounced] = useState(term);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(term), debounceMs);
    return () => clearTimeout(timer.current);
  }, [term, debounceMs]);

  const q = debounced.trim();
  const canRun = enabled && q.length >= minChars;

  // Stable cache key: term + whatever page-scoped filters are in effect.
  const paramsKey = JSON.stringify(baseParams ?? {});

  const query = useQuery({
    queryKey: ['global-search', q, paramsKey],
    enabled: canRun,
    staleTime: 15_000,
    queryFn: async () => {
      const res = await searchAPI.search({ q, ...baseParams });
      // Backend wraps payloads in { success, data }.
      return (res.data?.data ?? res.data) as GlobalSearchResponse;
    },
  });

  return {
    /** The debounced term actually being queried. */
    query: q,
    data: query.data,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    /** True once the user has typed enough to trigger a search. */
    active: canRun,
  };
}
