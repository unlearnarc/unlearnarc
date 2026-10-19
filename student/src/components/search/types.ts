/* =============================================================================
   Shared types for the global search feature. These mirror the backend
   `GlobalSearchResponse` / `SearchGroup` / `SearchResultItem` DTOs.
   ============================================================================= */

export type SearchTypeKey =
  | 'COURSE'
  | 'TOPIC'
  | 'DOMAIN'
  | 'SKILL'
  | 'INTERVIEW_EXPERIENCE'
  | 'CONTEST'
  | 'CONTEST_PROBLEM'
  | 'ALGORITHM'
  | 'COMPANY';

export interface SearchResultItem {
  type: SearchTypeKey;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  score: number;
  meta?: Record<string, unknown>;
}

export interface SearchGroup {
  type: SearchTypeKey;
  totalHits: number;
  page: number;
  size: number;
  hasMore: boolean;
  items: SearchResultItem[];
}

export interface GlobalSearchResponse {
  query: string;
  totalHits: number;
  tookMs: number;
  groups: SearchGroup[];
  flat: SearchResultItem[];
}
