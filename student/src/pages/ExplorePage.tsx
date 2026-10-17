import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { domainAPI, courseAPI, mappingAPI } from '../api/endpoints';
import {
  CourseCard,
  EmptyState,
  DomainRail,
  CourseCardSkeleton,
  SkeletonRepeat,
} from '../components/ui';
import type { Domain, Course, DomainSkillMapping, SkillCourseMapping } from '../types';
import { BookOpen, SlidersHorizontal, X, Search } from 'lucide-react';

const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];

/* The single Explore search filters the EXISTING domain + course lists in
   place — matching domains stay in the domain column, matching courses stay in
   the course column. There is no separate flat results surface, no modal, and
   no skill search: the search simply narrows what is already rendered. */

export const ExplorePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [level, setLevel] = useState('');
  const [term, setTerm] = useState('');
  const selectedDomain = searchParams.get('domain') ?? '';

  const { data: domainsRes, isLoading: domainsLoading } =
    useQuery({ queryKey: ['domains'], queryFn: domainAPI.getAll });
  const { data: coursesRes, isLoading } =
    useQuery({ queryKey: ['courses'], queryFn: courseAPI.getAll });

  /* Domain → Course is a two-hop relationship:
       Domain ─(domain_skill_mapping)─► Skill ─(skill_course_mapping)─► Course
     We load both join tables once and resolve the reachable course-id set for
     the selected domain on the client. */
  const { data: dsRes } = useQuery({
    queryKey: ['domain-skill-mappings'],
    queryFn: mappingAPI.domainSkill,
  });
  const { data: scRes } = useQuery({
    queryKey: ['skill-course-mappings'],
    queryFn: mappingAPI.skillCourse,
  });

  const allDomains: Domain[] = domainsRes?.data?.data ?? [];
  const allCourses: Course[] = coursesRes?.data?.data ?? [];
  const domainSkill: DomainSkillMapping[] = dsRes?.data?.data ?? [];
  const skillCourse: SkillCourseMapping[] = scRes?.data?.data ?? [];

  const q = term.trim().toLowerCase();

  // Matching domains — the search narrows the domain column in place.
  const domains = useMemo(
    () => (q ? allDomains.filter(d => d.name.toLowerCase().includes(q)) : allDomains),
    [allDomains, q],
  );

  /* Course ids reachable from the selected domain, via skills.
     `null` means "no domain selected" → do not constrain by domain. */
  const domainCourseIds = useMemo<Set<string> | null>(() => {
    if (!selectedDomain) return null;
    const skillIds = new Set(
      domainSkill.filter(m => m.domainId === selectedDomain).map(m => m.skillId),
    );
    const courseIds = new Set(
      skillCourse.filter(m => skillIds.has(m.skillId)).map(m => m.courseId),
    );
    return courseIds;
  }, [selectedDomain, domainSkill, skillCourse]);

  // Matching courses — domain filter → level filter → search term (order preserved).
  const filtered = useMemo(
    () => allCourses.filter(c =>
      (!domainCourseIds || domainCourseIds.has(c.id)) &&
      (!level || c.level === level) &&
      (!q || c.name.toLowerCase().includes(q)),
    ),
    [allCourses, domainCourseIds, level, q],
  );

  const activeDomain = allDomains.find(d => d.id === selectedDomain);

  /* ── Shared filter rows (reused across mobile & desktop) ──────────────── */

  // Horizontally-scrollable domain chips (mobile). Narrowed by the search term,
  // but the active chip always stays visible so the selection isn't lost.
  const domainChips = (
    <div className="flex gap-2 overflow-x-auto ua-scroll pb-1 -mx-1 px-1 snap-x">
      <Chip
        active={!selectedDomain}
        label={t('explore.allDomains')}
        onClick={() => setSearchParams({})}
      />
      {domains.map(d => (
        <Chip
          key={d.id}
          active={selectedDomain === d.id}
          label={d.name}
          onClick={() => setSearchParams({ domain: d.id })}
        />
      ))}
      {q && domains.length === 0 && (
        <span className="shrink-0 px-2 py-1.5 text-xs text-text-muted">{t('explore.noDomains')}</span>
      )}
    </div>
  );

  // Difficulty chips — work together with the domain filter, independently.
  const levelChips = (
    <div className="flex gap-2 overflow-x-auto ua-scroll pb-1 -mx-1 px-1 snap-x">
      <Chip active={!level} label={t('explore.allLevels')} onClick={() => setLevel('')} />
      {LEVELS.map(l => (
        <Chip
          key={l}
          active={level === l}
          label={t(`explore.levels.${l}`, { defaultValue: l })}
          onClick={() => setLevel(v => (v === l ? '' : l))}
        />
      ))}
    </div>
  );

  // Course count + active-domain label (shared).
  const countLine = (
    <p className="text-xs text-text-muted font-medium">
      {t('explore.coursesCount', { count: filtered.length })}
      {activeDomain && (
        <span className="text-text-secondary"> {t('explore.inDomain', { domain: activeDomain.name })}</span>
      )}
    </p>
  );

  // The single search input, shared by both layouts.
  const searchInput = (
    <div className="relative">
      <Search size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="text"
        value={term}
        onChange={e => setTerm(e.target.value)}
        placeholder={t('explore.search')}
        aria-label={t('explore.search')}
        className="input pl-10 pr-9 h-11 text-sm w-full"
      />
      {term && (
        <button
          onClick={() => setTerm('')}
          aria-label={t('explore.clear')}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-text-muted hover:text-text-primary"
        >
          <X size={15} aria-hidden="true" />
        </button>
      )}
    </div>
  );

  // Course grid / list body (shared between layouts, varies by card variant).
  const courseList = (variant: 'mobile' | 'grid') => {
    if (isLoading) {
      return variant === 'mobile' ? (
        <div className="space-y-4">
          <SkeletonRepeat count={4}><CourseCardSkeleton /></SkeletonRepeat>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonRepeat count={6}><CourseCardSkeleton /></SkeletonRepeat>
        </div>
      );
    }
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={BookOpen}
          title={t('explore.noCourses')}
          description={t('explore.noCoursesDesc')}
        />
      );
    }
    return variant === 'mobile' ? (
      <div className="space-y-4 ua-stagger">
        {filtered.map((course, i) => (
          <div key={course.id} style={{ '--i': i % 6 } as React.CSSProperties}>
            <CourseCard variant="mobile" course={course} actionLabel={t('explore.viewCourse')} />
          </div>
        ))}
      </div>
    ) : (
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4 ua-stagger">
        {filtered.map((course, i) => (
          <div key={course.id} style={{ '--i': i % 6 } as React.CSSProperties}>
            <CourseCard course={course} actionLabel={t('explore.viewCourse')} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="animate-fade-in">
      {/* Heading + subtitle */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-text-primary mb-1">{t('explore.title')}</h1>
        <p className="text-sm text-text-secondary">{t('explore.subtitle')}</p>
      </div>

      {/* ═══════════════ MOBILE / TABLET (<lg) ═══════════════
          The single search narrows the domain chips AND the course cards in
          their existing positions — no separate results surface. */}
      <div className="lg:hidden space-y-4">
        {searchInput}
        {domainChips}
        {levelChips}
        {countLine}
        {courseList('mobile')}
      </div>

      {/* ═══════════════ DESKTOP (≥lg) — sidebar + grid ═══════════════
          The same search narrows the domain rail (left column) and the course
          grid (right column) in place. */}
      <div className="hidden lg:flex lg:flex-col h-[calc(100vh-8.5rem)] min-h-0 overflow-hidden">
        <div className="shrink-0 mb-4">{searchInput}</div>

        <div className="flex-1 min-h-0 grid grid-cols-[18rem_1fr] gap-4">
          {/* Column 1 — domain rail (filtered by the search term) */}
          <aside className="card flex flex-col min-h-0 p-3 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto ua-scroll">
              <DomainRail
                bare
                domains={domains}
                activeId={selectedDomain}
                loading={domainsLoading}
                onSelect={id => setSearchParams(id ? { domain: id } : {})}
              />
              {q && domains.length === 0 && !domainsLoading && (
                <p className="px-2 py-3 text-xs text-text-muted">{t('explore.noDomains')}</p>
              )}
            </div>
          </aside>

          {/* Column 2 — level filter header + course grid (filtered in place) */}
          <section className="card flex flex-col min-h-0 p-4 overflow-hidden">
            <div className="shrink-0 space-y-3 pb-3 border-b border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-text-muted pr-1">
                  <SlidersHorizontal size={13} aria-hidden="true" /> {t('explore.level')}
                </span>
                {levelChips}
              </div>
              {countLine}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto ua-scroll pt-3">
              {courseList('grid')}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/* Compact, horizontally-scrollable filter chip. */
const Chip: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active, label, onClick,
}) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`snap-start shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition ${
      active
        ? 'bg-primary-500 text-white border-primary-500'
        : 'bg-surface text-text-secondary border-border hover:border-primary-500 hover:text-primary-500'
    }`}
  >
    {label}
  </button>
);
