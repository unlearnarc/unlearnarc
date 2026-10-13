/* =============================================================================
   Global search feature barrel.
     import { SearchPanel, GlobalSearchDialog, useGlobalSearch } from '../search';
   ============================================================================= */
export { SearchPanel } from './SearchPanel';
export type { SearchPanelProps } from './SearchPanel';
export { GlobalSearchDialog } from './GlobalSearchDialog';
export { SearchResultRow } from './SearchResultRow';
export { useGlobalSearch } from './useGlobalSearch';
export { SEARCH_TYPES, SEARCH_TYPE_ORDER } from './config';
export type { SearchTypeConfig } from './config';
export type {
  SearchResultItem, SearchGroup, GlobalSearchResponse, SearchTypeKey,
} from './types';
