import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Route as RouteIcon, Briefcase, BookOpen, CheckCircle2, ChevronRight, ChevronLeft,
  ChevronDown, Search, X, Layers, Clock, Target, AlertTriangle, Compass, RotateCcw, Plus,
} from 'lucide-react';
import { roadmapAPI } from '../api/endpoints';
import { EmptyState, Badge, Skeleton, SkeletonRepeat } from '../components/ui';

/* ── Types (mirror the backend DTOs — no derived/progress fields used) ─────── */
interface SkillTag { id: string; name: string; level?: string; }
interface Role { id: string; name: string; description?: string; skills?: SkillTag[]; }

interface RoadmapCourse {
  courseId: string; courseName: string; level: string;
  topicsCount: number; totalTime: string | null; completed: boolean;
}
interface RoadmapSkill { skillId: string; skillName: string; level: string; courses: RoadmapCourse[]; }
interface RoadmapStage { level: string; order: number; skills: RoadmapSkill[]; }
interface Roadmap {
  roleId: string; roleName: string; roleDescription?: string;
  totalSkills: number; totalCourses: number;
  stages: RoadmapStage[];
  domains: { id: string; name: string }[];
}

/* Per-level accent (border + text + dot) — restrained, token-driven. */
const STAGE_ACCENT: Record<string, { ring: string; text: string }> = {
  BEGINNER:     { ring: 'ring-success/30',     text: 'text-success' },
  INTERMEDIATE: { ring: 'ring-primary-500/30', text: 'text-primary-500' },
  ADVANCED:     { ring: 'ring-warning/30',     text: 'text-warning' },
  EXPERT:       { ring: 'ring-danger/30',      text: 'text-danger' },
};

/* =============================================================================
   PAGE — switches between the Explorer (role catalogue) and the Role Detail
   (learning roadmap) based on the selected role. Both views live here so the
   route and query state stay shared, exactly as before.
   ============================================================================= */
export const RoadmapPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<string>('');

  const roadmapQ = useQuery({
    queryKey: ['roadmap', selectedRole],
    queryFn: () => roadmapAPI.forRole(selectedRole),
    enabled: !!selectedRole,
  });
  const roadmap: Roadmap | undefined = roadmapQ.data?.data?.data;

  if (selectedRole) {
    return (
      <RoadmapDetail
        loading={roadmapQ.isLoading}
        error={roadmapQ.isError}
        roadmap={roadmap}
        onRetry={() => roadmapQ.refetch()}
        onBack={() => setSelectedRole('')}
        onOpenCourse={(id) => navigate(`/courses/${id}`)}
      />
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
  const roles: Role[] = rolesQ.data?.data?.data ?? [];

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
    <div className="animate-fade-in max-w-6xl mx-auto">
      {/* ── Static header + filters ──────────────────────────────────────
          Stays pinned while only the role grid below scrolls. The sticky
          offset matches the TopBar height so it tucks neatly beneath it. */}
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:-mx-6 sm:px-6 pt-1 pb-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 space-y-4">
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
   is always visible. Clicking outside or Escape closes the dropdown. ─────────── */
const VISIBLE_SKILL_CHIPS = 7;

const SkillFilterBar: React.FC<{
  skills: SkillTag[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}> = ({ skills, selectedId, onSelect }) => {
  const { t } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

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
  const overflowActive = overflow.some((s) => s.id === selectedId);

  // Close the dropdown on outside-click / Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenuOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full px-2.5 py-1 text-xs font-medium border transition ${
      active
        ? 'bg-primary-500 text-white border-primary-500'
        : 'bg-surface text-text-secondary border-border hover:border-primary-500'
    }`;

  return (
    <div className="-mx-4 px-4 sm:mx-0 sm:px-0">
      {/* Mobile: horizontally scrollable chips. Desktop: wraps. */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0 ua-scroll">
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
              className={chipClass(active)}
            >
              {s.name}
            </button>
          );
        })}

        {overflow.length > 0 && (
          <div ref={wrapRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className={`${chipClass(overflowActive)} inline-flex items-center gap-1`}
            >
              {overflowActive
                ? (ordered.find((s) => s.id === selectedId)?.name ?? t('roadmap.moreFilters', { count: overflow.length }))
                : t('roadmap.moreFilters', { count: overflow.length })}
              <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-[var(--ua-z-dropdown)] mt-1.5 max-h-72 w-56 overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-lg ua-scroll"
              >
                {overflow.map((s) => {
                  const active = selectedId === s.id;
                  return (
                    <button
                      key={s.id}
                      role="menuitemradio"
                      aria-checked={active}
                      onClick={() => { onSelect(active ? null : s.id); setMenuOpen(false); }}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition ${
                        active
                          ? 'bg-primary-50 text-primary-500'
                          : 'text-text-secondary hover:bg-surface-soft'
                      }`}
                    >
                      {active ? <CheckCircle2 size={13} className="shrink-0" /> : <Plus size={13} className="shrink-0 text-text-muted" />}
                      <span className="truncate">{s.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
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
      className="ua-card--accent card group flex h-full flex-col p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary-500 active:scale-[0.99]"
    >
      <div className="flex items-start justify-between">
        <div className="ua-icon-tile h-11 w-11 bg-primary-50 text-primary-500">
          <Briefcase size={20} />
        </div>
        <ChevronRight
          size={18}
          className="text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary-500 ua-flip-rtl"
        />
      </div>

      <h3 className="mt-3 text-base font-semibold text-text-primary group-hover:text-primary-500 transition-colors">
        {role.name}
      </h3>
      {role.description && (
        <p className="mt-1 line-clamp-2 text-sm text-text-muted">{role.description}</p>
      )}

      <div className="mt-auto pt-4 space-y-3">
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

/* =============================================================================
   PAGE 2 — ROADMAP ROLE DETAIL
   ============================================================================= */
const RoadmapDetail: React.FC<{
  loading: boolean;
  error: boolean;
  roadmap?: Roadmap;
  onRetry: () => void;
  onBack: () => void;
  onOpenCourse: (courseId: string) => void;
}> = ({ loading, error, roadmap, onRetry, onBack, onOpenCourse }) => {
  const { t } = useTranslation();
  const curriculumRef = useRef<HTMLDivElement>(null);

  const scrollToCurriculum = () =>
    curriculumRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  /* The first not-yet-completed course across stages → a reliable "next" target
     (derived only from the reliable discrete `completed` flag, not progress %). */
  const nextCourse = useMemo(() => {
    if (!roadmap) return undefined;
    for (const stage of roadmap.stages) {
      for (const sk of stage.skills) {
        const c = sk.courses.find((x) => !x.completed);
        if (c) return c;
      }
    }
    return undefined;
  }, [roadmap]);

  const hasAnyCourse = useMemo(
    () => !!roadmap && roadmap.stages.some((s) => s.skills.some((sk) => sk.courses.length > 0)),
    [roadmap],
  );
  const hasStarted = useMemo(
    () => !!roadmap && roadmap.stages.some((s) => s.skills.some((sk) => sk.courses.some((c) => c.completed))),
    [roadmap],
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
      {/* Breadcrumb / back */}
      <nav aria-label="Breadcrumb">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-text-muted hover:text-primary-500 transition"
        >
          <ChevronLeft size={16} className="ua-flip-rtl" /> {t('roadmap.allRoles')}
        </button>
      </nav>

      {loading ? (
        <>
          <div className="card p-6 space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
            <div className="flex gap-2 pt-2">
              <Skeleton className="h-6 w-20" rounded="full" />
              <Skeleton className="h-6 w-24" rounded="full" />
            </div>
          </div>
          <SkeletonRepeat count={3}>
            <div className="card p-5 space-y-3">
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-10 w-full" rounded="lg" />
              <Skeleton className="h-10 w-full" rounded="lg" />
            </div>
          </SkeletonRepeat>
        </>
      ) : error || !roadmap ? (
        <EmptyState
          icon={AlertTriangle}
          title={t('roadmap.loadError')}
          description={t('roadmap.loadErrorDesc')}
          action={
            <button onClick={onRetry} className="btn-primary">
              <RotateCcw size={15} /> {t('roadmap.retry')}
            </button>
          }
        />
      ) : (
        <>
          {/* ── Role summary card (no progress graphics) ──────────────────── */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="ua-icon-tile hidden sm:flex h-12 w-12 shrink-0 bg-primary-50 text-primary-500">
                <Briefcase size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-text-primary">{roadmap.roleName}</h1>
                {roadmap.roleDescription && (
                  <p className="mt-1 text-sm text-text-muted">{roadmap.roleDescription}</p>
                )}

                {/* Domains + discrete counts (no percentages) */}
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  {roadmap.domains.map((d) => (
                    <span key={d.id} className="rounded-full bg-surface-soft px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                      {d.name}
                    </span>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-text-secondary">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers size={15} className="text-text-muted" />
                    {t('roadmap.skillsCount', { count: roadmap.totalSkills })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen size={15} className="text-text-muted" />
                    {t('roadmap.coursesCount', { count: roadmap.totalCourses })}
                  </span>
                </div>

                {/* Primary learning action */}
                {hasAnyCourse && (
                  <div className="mt-4">
                    <button
                      onClick={() => (nextCourse ? onOpenCourse(nextCourse.courseId) : scrollToCurriculum())}
                      className="btn-primary"
                    >
                      {nextCourse
                        ? (hasStarted ? t('roadmap.continueLearning') : t('roadmap.startLearning'))
                        : t('roadmap.viewCourses')}
                      <ChevronRight size={15} className="ua-flip-rtl" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ── Curriculum (numbered stages) ──────────────────────────────── */}
          <div ref={curriculumRef}>
            {roadmap.stages.length === 0 ? (
              <EmptyState
                icon={RouteIcon}
                title={t('roadmap.stillBuilding')}
                description={t('roadmap.stillBuildingDesc')}
              />
            ) : (
              <div className="relative">
                {/* subtle vertical timeline (desktop) */}
                <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-border hidden sm:block" aria-hidden />
                <div className="space-y-8">
                  {roadmap.stages.map((stage) => (
                    <StageBlock key={stage.level} stage={stage} onOpenCourse={onOpenCourse} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Stage block ───────────────────────────────────────────────────────────── */
const StageBlock: React.FC<{
  stage: RoadmapStage;
  onOpenCourse: (courseId: string) => void;
}> = ({ stage, onOpenCourse }) => {
  const { t } = useTranslation();
  const accent = STAGE_ACCENT[stage.level] ?? STAGE_ACCENT.INTERMEDIATE;

  return (
    <section className="relative">
      {/* Stage header */}
      <div className="mb-4 flex items-center gap-3">
        <div className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface font-bold shadow-sm ring-4 ${accent.ring}`}>
          <span className={accent.text}>{stage.order + 1}</span>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">
              {t('roadmap.stage', { num: stage.order + 1 })}
            </h2>
            <Badge label={stage.level} />
          </div>
          <p className="text-xs text-text-muted">
            {t('roadmap.skillsToMaster', { count: stage.skills.length })}
          </p>
        </div>
      </div>

      {/* Skill groups */}
      <div className="space-y-3 sm:pl-[52px]">
        {stage.skills.map((sk) => (
          <SkillGroup key={sk.skillId} skill={sk} accentText={accent.text} onOpenCourse={onOpenCourse} />
        ))}
      </div>
    </section>
  );
};

/* ── Skill group (collapsible when it has multiple courses) ────────────────── */
const SkillGroup: React.FC<{
  skill: RoadmapSkill;
  accentText: string;
  onOpenCourse: (courseId: string) => void;
}> = ({ skill, accentText, onOpenCourse }) => {
  const { t } = useTranslation();
  const total = skill.courses.length;
  const collapsible = total > 1;
  const [open, setOpen] = useState(true);
  const expanded = collapsible ? open : true;

  const headerInner = (
    <>
      <div className="flex items-center gap-2 min-w-0">
        {collapsible && (
          <ChevronDown
            size={16}
            className={`shrink-0 text-text-muted transition-transform ${expanded ? '' : '-rotate-90 ua-flip-rtl'}`}
          />
        )}
        <Target size={15} className={`${accentText} shrink-0`} />
        <h3 className="truncate text-sm font-semibold text-text-primary">{skill.skillName}</h3>
      </div>
      <span className="shrink-0 text-xs font-medium text-text-muted">
        {t('roadmap.coursesCount', { count: total })}
      </span>
    </>
  );

  return (
    <div className="card overflow-hidden p-0">
      {collapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={expanded}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-surface-soft"
        >
          {headerInner}
        </button>
      ) : (
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          {headerInner}
        </div>
      )}

      {expanded && (
        total === 0 ? (
          <p className="px-4 py-3 text-xs italic text-text-muted">{t('roadmap.noCoursesMapped')}</p>
        ) : (
          <ul className={collapsible ? 'divide-y divide-border border-t border-border' : 'divide-y divide-border'}>
            {skill.courses.map((c) => (
              <li key={c.courseId}>
                <button
                  type="button"
                  onClick={() => onOpenCourse(c.courseId)}
                  className="group flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-surface-soft active:bg-surface-soft"
                >
                  {/* Discrete completion check only — no progress bars/percent */}
                  {c.completed ? (
                    <CheckCircle2 size={18} className="shrink-0 text-success" />
                  ) : (
                    <BookOpen size={16} className="shrink-0 text-primary-500" />
                  )}
                  <span className={`flex-1 truncate text-sm ${c.completed ? 'text-text-muted' : 'text-text-primary'}`}>
                    {c.courseName}
                  </span>
                  {c.totalTime && (
                    <span className="hidden items-center gap-1 text-xs text-text-muted sm:inline-flex">
                      <Clock size={12} /> {c.totalTime}
                    </span>
                  )}
                  {c.topicsCount > 0 && (
                    <span className="hidden text-xs text-text-muted md:inline">
                      {t('roadmap.topics', { count: c.topicsCount })}
                    </span>
                  )}
                  <Badge label={c.level} />
                  <ChevronRight size={14} className="shrink-0 text-text-muted transition group-hover:translate-x-0.5 group-hover:text-primary-500 ua-flip-rtl" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </div>
  );
};
