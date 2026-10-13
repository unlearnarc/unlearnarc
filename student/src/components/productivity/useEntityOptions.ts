import { useQuery } from '@tanstack/react-query';
import { courseAPI, domainAPI } from '../../api/endpoints';
import type { Course, Domain } from '../../types';
import type { LinkKind, LinkRef } from './types';

/* =============================================================================
   useEntityOptions — fetches the list of courses & domains a productivity item
   can be linked to. Results are cached by react-query (5-min stale) and shaped
   into a flat `LinkRef[]` the LinkPicker can filter over.

   Topics are not fetched up-front (they live under a course); when a user picks
   a topic we fall back to linking the parent course, which is the common case
   for "this note belongs to Course X". Extending to topic-level is a matter of
   lazily fetching `courseAPI.getById(id).topics` inside the picker.
   ============================================================================= */

interface EntityOption extends LinkRef {
  kind: LinkKind;
}

export function useEntityOptions() {
  const courses = useQuery({
    queryKey: ['prod', 'link-courses'],
    queryFn: async () => {
      const { data } = await courseAPI.getAll();
      const list: Course[] = data?.data ?? data ?? [];
      return list;
    },
    staleTime: 5 * 60_000,
  });

  const domains = useQuery({
    queryKey: ['prod', 'link-domains'],
    queryFn: async () => {
      const { data } = await domainAPI.getAll();
      const list: Domain[] = data?.data ?? data ?? [];
      return list;
    },
    staleTime: 5 * 60_000,
  });

  const options: EntityOption[] = [
    ...(domains.data ?? []).map<EntityOption>((d) => ({
      kind: 'DOMAIN',
      id: d.id,
      label: d.name,
    })),
    ...(courses.data ?? []).map<EntityOption>((c) => ({
      kind: 'COURSE',
      id: c.id,
      label: c.name,
    })),
  ];

  return {
    options,
    isLoading: courses.isLoading || domains.isLoading,
  };
}
