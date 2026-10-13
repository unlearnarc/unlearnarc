import {
  BookOpen, GraduationCap, Globe, MessageSquareText,
  Trophy, Building2, Binary, Code2, type LucideIcon,
} from 'lucide-react';
import type { SearchResultItem, SearchTypeKey } from './types';

/* =============================================================================
   Central registry for every searchable resource type.

   • `label`    — human title shown in section headers / type chips.
   • `icon`     — lucide icon rendered beside each result.
   • `accent`   — tailwind text colour for the icon.
   • `to(item)` — builds the in-app route a result should navigate to.

   Adding a new searchable type = one entry here; the TopBar + SearchPanel +
   per-page search all pick it up automatically.
   ============================================================================= */

export interface SearchTypeConfig {
  key: SearchTypeKey;
  label: string;
  plural: string;
  icon: LucideIcon;
  accent: string;
  /** Resolve the destination route for a given hit (null = not navigable). */
  to: (item: SearchResultItem) => string | null;
}

export const SEARCH_TYPES: Record<SearchTypeKey, SearchTypeConfig> = {
  COURSE: {
    key: 'COURSE',
    label: 'Course',
    plural: 'Courses',
    icon: BookOpen,
    accent: 'text-emerald-600',
    to: (i) => `/courses/${i.id}`,
  },
  TOPIC: {
    key: 'TOPIC',
    label: 'Topic',
    plural: 'Topics',
    icon: GraduationCap,
    accent: 'text-amber-600',
    // topics live under their course; fall back to course detail if we know it
    to: (i) => {
      const courseId = i.meta?.courseId as string | undefined;
      return courseId ? `/courses/${courseId}` : null;
    },
  },
  DOMAIN: {
    key: 'DOMAIN',
    label: 'Domain',
    plural: 'Domains',
    icon: Globe,
    accent: 'text-sky-600',
    to: (i) => `/explore?domain=${encodeURIComponent(i.id)}`,
  },
  INTERVIEW_EXPERIENCE: {
    key: 'INTERVIEW_EXPERIENCE',
    label: 'Interview',
    plural: 'Interview Experiences',
    icon: MessageSquareText,
    accent: 'text-rose-600',
    to: () => `/interview-experiences`,
  },
  CONTEST: {
    key: 'CONTEST',
    label: 'Contest',
    plural: 'Contests',
    icon: Trophy,
    accent: 'text-yellow-600',
    to: (i) => `/contests/${i.id}`,
  },
  CONTEST_PROBLEM: {
    key: 'CONTEST_PROBLEM',
    label: 'Problem',
    plural: 'Problems',
    icon: Code2,
    accent: 'text-orange-600',
    // deep-link to the parent contest; the problem id is carried for preselect
    to: (i) => {
      const contestId = i.meta?.contestId as string | undefined;
      return contestId ? `/contests/${contestId}?problem=${encodeURIComponent(i.id)}` : null;
    },
  },
  ALGORITHM: {
    key: 'ALGORITHM',
    label: 'Algorithm',
    plural: 'Algorithms',
    icon: Binary,
    accent: 'text-teal-600',
    // algorithm detail is keyed by slug, not id
    to: (i) => {
      const slug = i.meta?.slug as string | undefined;
      return slug ? `/algorithms/${slug}` : `/algorithms`;
    },
  },
  COMPANY: {
    key: 'COMPANY',
    label: 'Company',
    plural: 'Companies',
    icon: Building2,
    accent: 'text-primary-500',
    // pivot into the interview feed filtered by this company
    to: (i) => `/interview-experiences?company=${encodeURIComponent(i.title)}`,
  },
};

/** Ordered list for rendering type chips / sections in a stable sequence. */
export const SEARCH_TYPE_ORDER: SearchTypeKey[] = [
  'COURSE', 'TOPIC', 'DOMAIN', 'ALGORITHM',
  'CONTEST', 'CONTEST_PROBLEM', 'INTERVIEW_EXPERIENCE', 'COMPANY',
];
