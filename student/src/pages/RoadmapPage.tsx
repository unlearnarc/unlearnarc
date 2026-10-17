import React, { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Briefcase, ChevronRight,
  Search, X, AlertTriangle, Compass, RotateCcw,
} from 'lucide-react';
import { enrollmentAPI, roadmapAPI } from '../api/endpoints';
import './roadmap.css';
import { RoadmapJourney } from './RoadmapJourney';
import type { Roadmap, RoadmapCourse } from './roadmapModel';
import { EmptyState, Skeleton, SkeletonRepeat } from '../components/ui';
import { SearchableSelect } from '../components/ui/SearchableSelect';

/* ── Types (mirror the backend DTOs — no derived/progress fields used) ─────── */
interface SkillTag { id: string; name: string; level?: string; }
interface Role { id: string; name: string; description?: string; skills?: SkillTag[]; }

/* =============================================================================
   PAGE — switches between the Explorer (role catalogue) and the Role Detail
   (learning roadmap) based on the selected role. Both views live here so the
   route and query state stay shared, exactly as before.
   ============================================================================= */
export const RoadmapPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const selectedRole = params.get('role') ?? '';
  const setSelectedRole = (role: string) => setParams(role ? { role } : {});

  const roadmapQ = useQuery({
    queryKey: ['roadmap', selectedRole],
    queryFn: () => roadmapAPI.forRole(selectedRole),
    enabled: !!selectedRole,
    // Pick up quiz completion from another tab even during the shared cache window.
    refetchOnWindowFocus: 'always',
  });
  const roadmap: Roadmap | undefined = roadmapQ.data?.data?.data;

  if (selectedRole) {
    return (
      <div className="roadmap-detail max-w-6xl mx-auto">
        {roadmapQ.isLoading ? <div className="card p-6 space-y-4" aria-label="Loading roadmap"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-40 w-full" /></div>
          : roadmapQ.isError || !roadmap ? <EmptyState icon={AlertTriangle} title="Could not load roadmap" description="Please try again."
            action={<><button className="btn-primary" onClick={() => roadmapQ.refetch()}>Retry</button><button className="btn-secondary" onClick={() => setSelectedRole('')}>All roles</button></>} />
          : <RoadmapJourney key={roadmap.roleId} roadmap={roadmap} onBack={() => setSelectedRole('')} pickAction={course => <PickCourse course={course} />} />}
      </div>
    );
  }

  return <RoadmapExplorer onSelectRole={setSelectedRole} />;
};

/* =============================================================================
   PAGE 1 — ROADMAP EXPLORER
   ============================================================================= */
const RoadmapExplorer: React.FC<{ onSelectRole: (id: string) => void }> = ({ onSelectRole }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [skillFilter, setSkillFilter] = useState<string | null>(null);

  const rolesQ = useQuery({ queryKey: ['roadmap-roles'], queryFn: roadmapAPI.roles });
  const roles: Role[] = useMemo(() => rolesQ.data?.data?.data ?? [], [rolesQ.data]);

  /* Distinct skills across all roles — drives the category/skill chips. */
  const allSkills = useMemo(() => {
    const map = new Map<string, SkillTag>();
    roles.forEach((r) => r.skills?.forEach((s) => { if (!map.has(s.id)) map.set(s.id, s); }));
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [roles]);

  const filteredRoles = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roles.filter((r) => {
      const matchesText = !q
        || r.name.toLowerCase().includes(q)
        || r.description?.toLowerCase().includes(q)
        || r.skills?.some((s) => s.name.toLowerCase().includes(q));
      const matchesSkill = !skillFilter || r.skills?.some((s) => s.id === skillFilter);
      return matchesText && matchesSkill;
    });
  }, [roles, query, skillFilter]);

  const hasActiveFilter = query.trim().length > 0 || skillFilter !== null;
  const resetFilters = useCallback(() => { setQuery(''); setSkillFilter(null); }, []);

  return (
    <div className="roadmap-explorer animate-fade-in max-w-6xl mx-auto">
      {/* ── Static header + filters ──────────────────────────────────────
          Stays pinned while only the role grid below scrolls. The sticky
          offset matches the TopBar height so it tucks neatly beneath it. */}
      <div className="roadmap-explorer-toolbar sm:sticky sm:top-0 z-20 pt-1 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-4">
        {/* Page header */}
        <header className="flex items-start gap-3">
          <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-50 text-primary-500">
            <Compass size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-text-primary">{t('roadmap.pageTitle')}</h1>
            <p className="mt-1 text-sm text-text-muted max-w-2xl">{t('roadmap.pageSubtitle')}</p>
          </div>
        </header>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted ua-flip-rtl" size={16} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('roadmap.searchPlaceholder')}
              className="input w-full pl-9 pr-9"
              aria-label={t('roadmap.searchPlaceholder')}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
                aria-label={t('roadmap.clearSearch')}
              >
                <X size={15} />
              </button>
            )}
          </div>

          {allSkills.length > 0 && (
            <SkillFilterBar
              skills={allSkills}
              selectedId={skillFilter}
              onSelect={(id) => setSkillFilter(id)}
            />
          )}

          {/* Result count + reset */}
          {!rolesQ.isLoading && !rolesQ.isError && roles.length > 0 && (
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-text-muted" aria-live="polite">
                {t('roadmap.roleCount', { count: filteredRoles.length })}
              </p>
              {hasActiveFilter && (
                <button
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 text-xs font-medium text-text-muted hover:text-primary-500 transition"
                >
                  <RotateCcw size={12} /> {t('roadmap.resetFilters')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Scrollable content: states / grid ───────────────────────────── */}
      <div className="pt-4 space-y-6">
      {/* ── States: loading / error / empty / no-match / grid ───────────── */}
      {rolesQ.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SkeletonRepeat count={6}>
            <div className="card p-5 space-y-3">
              <Skeleton className="h-11 w-11" rounded="xl" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <div className="flex gap-1.5 pt-1">
                <Skeleton className="h-5 w-14" rounded="full" />
                <Skeleton className="h-5 w-16" rounded="full" />
              </div>
            </div>
          </SkeletonRepeat>
        </div>
      ) : rolesQ.isError ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('roadmap.loadError')}
          description={t('roadmap.loadErrorDesc')}
          action={
            <button onClick={() => rolesQ.refetch()} className="btn-primary">
              <RotateCcw size={15} /> {t('roadmap.retry')}
            </button>
          }
        />
      ) : roles.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title={t('roadmap.noRoles')}
          description={t('roadmap.noRolesDesc')}
        />
      ) : filteredRoles.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t('roadmap.noMatch')}
          description={t('roadmap.noMatchDesc')}
          action={
            <button onClick={resetFilters} className="btn-secondary">
              <RotateCcw size={15} /> {t('roadmap.resetFilters')}
            </button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((r) => (
            <RoleCard
              key={r.id}
              role={r}
              highlightSkillId={skillFilter}
              onOpen={() => onSelectRole(r.id)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

/* ── Skill filter bar — shows first 7 chips inline; the rest collapse into a
   "More" dropdown. Picking a hidden skill promotes it so the active selection
   is always visible. The shared searchable combobox handles dismissal and keyboard navigation. ─────────── */
const VISIBLE_SKILL_CHIPS = 7;

const SkillFilterBar: React.FC<{
  skills: SkillTag[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ skills, selectedId, onSelect }) => {
  const { t } = useTranslation();

  // Keep the selected skill visible even if it lives in the overflow bucket.
  const ordered = useMemo(() => {
    if (!selectedId) return skills;
    const idx = skills.findIndex((s) => s.id === selectedId);
    if (idx < VISIBLE_SKILL_CHIPS || idx === -1) return skills;
    const copy = [...skills];
    const [sel] = copy.splice(idx, 1);
    copy.splice(VISIBLE_SKILL_CHIPS - 1, 0, sel);
    return copy;
  }, [skills, selectedId]);

  const visible = ordered.slice(0, VISIBLE_SKILL_CHIPS);
  const overflow = ordered.slice(VISIBLE_SKILL_CHIPS);
  const chipClass = (active: boolean) =>
    `roadmap-filter-chip rounded-full px-2.5 py-1 text-xs font-medium border transition ${
      active
        ? 'bg-primary-500 text-white border-primary-500'
        : 'bg-surface text-text-secondary border-border hover:border-primary-500'
    }`;

  return (
    <div className="roadmap-filters">
      {/* Wrap filters so chips and the overflow menu remain reachable. */}
      <div className="roadmap-filter-chips flex flex-wrap items-center gap-1.5">
        <span className="shrink-0 text-xs font-medium text-text-muted mr-0.5">
          {t('roadmap.filterBySkill')}
        </span>

        {visible.map((s) => {
          const active = selectedId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(active ? null : s.id)}
              aria-pressed={active}
              title={s.name}
              className={chipClass(active)}
            >
              {s.name}
            </button>
          );
        })}

        {overflow.length > 0 && (
          <div className="roadmap-filter-overflow">
            <label htmlFor="roadmap-more-skills" className="sr-only">
              {t('roadmap.filterBySkill')}
            </label>
            <SearchableSelect
              id="roadmap-more-skills"
              value=""
              options={overflow.map(skill => ({ value: skill.id, label: skill.name }))}
              onChange={onSelect}
              placeholder={t('roadmap.moreFilters', { count: overflow.length })}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Role card ─────────────────────────────────────────────────────────────── */
const RoleCard: React.FC<{
  role: Role;
  highlightSkillId: string | null;
  onOpen: () => void;
}> = ({ role, highlightSkillId, onOpen }) => {
  const { t } = useTranslation();
  const skills = role.skills ?? [];
  const shown = skills.slice(0, 5);
  const extra = skills.length - shown.length;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="roadmap-role-card ua-card--accent card group flex flex-col p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary-500 active:scale-[0.99]"
    >
      <div className="flex items-center gap-2.5">
        <div className="ua-icon-tile h-9 w-9 shrink-0 bg-primary-50 text-primary-500">
          <Briefcase size={18} />
        </div>
        <h3 className="min-w-0 flex-1 text-sm sm:text-base font-semibold text-text-primary group-hover:text-primary-500 transition-colors">
          {role.name}
        </h3>
        <ChevronRight
          size={16}
          className="shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary-500 ua-flip-rtl"
        />
      </div>
      {role.description && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{role.description}</p>
      )}

      <div className="pt-2.5 space-y-2">
        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((s) => (
              <span
                key={s.id}
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  highlightSkillId === s.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-surface-soft text-text-secondary'
                }`}
              >
                {s.name}
              </span>
            ))}
            {extra > 0 && (
              <span className="rounded-full bg-surface-soft px-2 py-0.5 text-xs font-medium text-text-muted">
                +{extra}
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs italic text-text-muted">{t('roadmap.noSkillsMapped')}</span>
        )}

        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500">
          {t('roadmap.exploreRoadmap')} <ChevronRight size={15} className="ua-flip-rtl" />
        </span>
      </div>
    </button>
  );
};

const PickCourse: React.FC<{ course: RoadmapCourse }> = ({ course }) => {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => enrollmentAPI.enroll(course.courseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmap'] });
      queryClient.invalidateQueries({ queryKey: ['my-learnings'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-status', course.courseId] });
      queryClient.invalidateQueries({ queryKey: ['course-progress', course.courseId] });
      toast.success('Course added to My Learnings');
    },
    onError: () => toast.error('Could not save this course. Please try again.'),
  });
  return (
    <button type="button" className="btn-secondary text-xs shrink-0 my-2" disabled={course.enrolled || mutation.isPending}
      onClick={() => mutation.mutate()} aria-label={`${course.enrolled ? 'Picked' : 'Pick course'}: ${course.courseName}`}>
      {course.enrolled ? 'Picked' : mutation.isPending ? 'Saving…' : 'Pick course'}
    </button>
  );
};
