import api from './client';
import type {
  TestGenerationRequest, TestSubmission, InterviewExperienceRequest,
  SubmissionRequest,
} from '../types';

// ── Global Search ─────────────────────────────────────────────────────────────
export interface SearchParams {
  q?: string;
  /** Comma-separated types, or array. Omit to search everything. */
  types?: string | string[];
  level?: string;
  company?: string;
  courseId?: string;
  status?: string;
  difficulty?: string;   // EASY | MEDIUM | HARD — filters ALGORITHM / CONTEST_PROBLEM
  verifiedOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string;         // 'relevance' (default) | 'name' | ...
  direction?: 'ASC' | 'DESC';
  flatPage?: number;
  flatSize?: number;
}

export const searchAPI = {
  /**
   * Unified search across course, topic, skill, domain, interview experience,
   * company and contest. Pass `types` to restrict; omit to search all.
   */
  search: (params: SearchParams = {}) => {
    const { types, ...rest } = params;
    return api.get('/search', {
      params: {
        ...rest,
        types: Array.isArray(types) ? types.join(',') : types,
      },
    });
  },
};

// ── Domains ─────────────────────────────────────────────────────────────────
export const domainAPI = {
  getAll:  ()           => api.get('/domains'),
  getById: (id: string) => api.get(`/domains/${id}`),
};

// ── Skills ───────────────────────────────────────────────────────────────────
export const skillAPI = {
  getAll:     ()                        => api.get('/skills'),
  getById:    (id: string)              => api.get(`/skills/${id}`),
  getByDomain:(domainId: string)        => api.get(`/domain-skill-mappings/domain/${domainId}`),
};

// ── Courses ──────────────────────────────────────────────────────────────────
export const courseAPI = {
  getAll:     ()           => api.get('/courses'),
  getById:    (id: string) => api.get(`/courses/${id}`),
  getBySkill: (skillId: string) => api.get(`/skill-course-mappings/skill/${skillId}`),
};

// ── Mappings (Domain→Skill→Course join tables) ───────────────────────────────
// Needed to resolve which courses belong to a domain: the relationship is two
// hops — Domain ─(domainSkill)─► Skill ─(skillCourse)─► Course.
export const mappingAPI = {
  /** All domain↔skill links. */
  domainSkill: () => api.get('/domain-skill-mappings'),
  /** All skill↔course links. */
  skillCourse: () => api.get('/skill-course-mappings'),
};

// ── Enrollments ("My Learnings") ──────────────────────────────────────────────
export const enrollmentAPI = {
  /** Courses the authenticated user has started learning. */
  getMine:   ()               => api.get('/enrollments/me'),
  /** Whether the current user has started a given course. */
  status:    (courseId: string) => api.get(`/enrollments/course/${courseId}/status`),
  /** Start learning a course — maps it to the user. Idempotent. */
  enroll:    (courseId: string) => api.post(`/enrollments/course/${courseId}`),
  /** Server-derived course and topic quiz mastery for the current learner. */
  progress: (courseId: string) => api.get(`/enrollments/course/${courseId}/progress`),
  /** Stop learning a course. */
  unenroll:  (courseId: string) => api.delete(`/enrollments/course/${courseId}`),
};

// ── Roles & Roadmap ────────────────────────────────────────────────────────────
export const roadmapAPI = {
  /** All roles a learner can pick a roadmap for. */
  roles:   ()               => api.get('/roles'),
  /** Full roadmap for a role (Role → Domains → Skills → Courses), with
   *  per-course completion flags scoped to the current user. */
  forRole: (roleId: string) => api.get(`/roadmap/role/${roleId}`),
};

// ── Topics ───────────────────────────────────────────────────────────────────
export const topicAPI = {
  getByCourse: (courseId: string) => api.get(`/topics/by-course/${courseId}`),
  getById:     (id: string)       => api.get(`/topics/${id}`),
};

// ── Study Materials ──────────────────────────────────────────────────────────
export const studyMaterialAPI = {
  getByTopic: (topicId: string) => api.get(`/study-materials/topic/${topicId}`),
  getById:    (id: string)      => api.get(`/study-materials/${id}`),
};

// ── Notes (book-style lessons rendered in-app) ───────────────────────────────
export const noteAPI = {
  // published-only summaries for learners
  getByTopic:  (topicId: string)  => api.get(`/notes/topic/${topicId}`),
  getByCourse: (courseId: string) => api.get(`/notes/course/${courseId}`),
  // full lesson body (published only for students; backend enforces)
  getById:     (id: string)       => api.get(`/notes/${id}`),
};

// ── Question Pools ───────────────────────────────────────────────────────────
export const poolAPI = {
  getByDomain: (id: string) => api.get(`/question-pools/by-domain/${id}`),
  getByCourse: (id: string) => api.get(`/question-pools/by-course/${id}`),
  getByTopic:  (id: string) => api.get(`/question-pools/by-topic/${id}`),
  getById:     (id: string) => api.get(`/question-pools/${id}`),
};

// ── Test Engine ──────────────────────────────────────────────────────────────
export const testAPI = {
  generate: (data: TestGenerationRequest) => api.post('/tests/generate', data),
  grade:    (data: TestSubmission)         => api.post('/tests/grade',    data),
  /** Paginated history of the authenticated user's past attempts (newest first). */
  history:  (page = 0, size = 20) =>
    api.get('/tests/history', { params: { page, size } }),
  /** Full graded detail of one past attempt. */
  attempt:  (attemptId: string) => api.get(`/tests/history/${attemptId}`),
  /** Quick at-a-glance insights dashboard. Omit windowDays for all-time. */
  insightsDashboard: (windowDays?: number) =>
    api.get('/tests/insights/dashboard', { params: windowDays ? { windowDays } : {} }),
  /** Detailed "where to improve" report (weak areas, difficulty gaps, recurring mistakes). */
  improvementReport: (windowDays?: number) =>
    api.get('/tests/insights/improvement', { params: windowDays ? { windowDays } : {} }),
};

// ── User Auth ────────────────────────────────────────────────────────────────
export const userAuthAPI = {
  me:      ()                         => api.get('/user-auth/me'),
  refresh: (refreshToken: string)     => api.post('/user-auth/refresh', { refreshToken }),
  /** Set/update the authenticated user's region (feeds the region leaderboard). */
  updateRegion: (region: string)      => api.patch('/user-auth/me/region', { region }),
  /** Persist the authenticated user's Coach Buddy (mascot) preferences.
   *  PATCH semantics: send only the fields you want to change. */
  updateMascot: (prefs: { character?: string; vibe?: 'friend' | 'companion'; muted?: boolean }) =>
    api.patch('/user-auth/me/mascot', prefs),
  /** Persist the "read aloud" (text-to-speech) accessibility preference.
   *  Optional endpoint — the client works fully offline via localStorage, this
   *  just mirrors the flag to the server when the backend route exists. */
  updateTts: (prefs: { ttsEnabled: boolean }) =>
    api.patch('/user-auth/me/tts', prefs),
  /** Read the authenticated user's daily-activity streak (no mutation). */
  getStreak:    ()                    => api.get('/user-auth/me/streak'),
  /** Mark the user active today; idempotent per day. Returns updated streak. */
  pingStreak:   ()                    => api.post('/user-auth/me/streak/ping'),
  /** Active-day calendar (heat-map) for the profile. Optional yyyy-MM-dd window. */
  streakCalendar: (from?: string, to?: string) =>
    api.get("/user-auth/me/streak/calendar", { params: { ...(from ? { from } : {}), ...(to ? { to } : {}) } }),
};

// ── Algorithm Visualizer ─────────────────────────────────────────────────────
export const algorithmAPI = {
  // published-only feed for learners
  getAll:    ()             => api.get('/algorithms/published'),
  getById:   (id: string)   => api.get(`/algorithms/${id}`),
  getBySlug: (slug: string) => api.get(`/algorithms/slug/${slug}`),
};

// ── Canvas Animation Scenes (time-based, interpolated) ────────────────────────
export const animationSceneAPI = {
  /** published-only catalog for learners; optional category filter */
  getAll:    (category?: string) =>
    api.get('/animation-scenes/published', { params: category ? { category } : undefined }),
  getById:   (id: string)   => api.get(`/animation-scenes/${id}`),
  getBySlug: (slug: string) => api.get(`/animation-scenes/slug/${slug}`),
};

// ── Contests ─────────────────────────────────────────────────────────────────
export const contestAPI = {
  getAll:        ()                                  => api.get('/contests'),
  getById:       (contestId: string)                 => api.get(`/contests/${contestId}`),
  getProblems:   (contestId: string)                 => api.get(`/contests/${contestId}/problems`),
  getProblem:    (contestId: string, problemId: string) =>
    api.get(`/contests/${contestId}/problems/${problemId}`),
  /** Signed test inputs for local execution. Also starts participation. */
  challenge:     (contestId: string, problemId: string) =>
    api.get(`/contests/${contestId}/problems/${problemId}/challenge`),
  register:      (contestId: string)                 => api.post(`/contests/${contestId}/register`),
  /** Post locally-executed outputs; server re-validates & scores. */
  submit:        (contestId: string, data: SubmissionRequest) =>
    api.post(`/contests/${contestId}/submit`, data),
  leaderboard:   (contestId: string)                 => api.get(`/contests/${contestId}/leaderboard`),
  mySubmissions: (contestId: string)                 => api.get(`/contests/${contestId}/my-submissions`),
  myProgress:    () => api.get('/contests/my-progress'),
};

// ── Interview Experiences ────────────────────────────────────────────────────
export const interviewAPI = {
  // public verified feed (optional company filter)
  getFeed:  (company?: string) =>
    api.get('/interview-experiences', { params: company ? { company } : {} }),
  getMine:  ()                            => api.get('/interview-experiences/me'),
  getById:  (id: string)                  => api.get(`/interview-experiences/${id}`),
  create:   (data: InterviewExperienceRequest) => api.post('/interview-experiences', data),
  update:   (id: string, data: InterviewExperienceRequest) =>
    api.put(`/interview-experiences/${id}`, data),
  delete:   (id: string)                  => api.delete(`/interview-experiences/${id}`),
};

// ── Opt-in public profiles ────────────────────────────────────────────────────
export const profileSharingAPI = {
  settings: () => api.get('/user-auth/me/sharing'),
  update: (enabled: boolean) => api.put('/user-auth/me/sharing', { enabled }),
  publicProfile: (token: string) => api.get(`/public/profiles/${encodeURIComponent(token)}`),
};

// ── Leaderboard ───────────────────────────────────────────────────────────────
export const leaderboardAPI = {
  /** Global top-N (default 50, max 100). */
  global:  (limit = 50)                 => api.get('/leaderboard', { params: { limit } }),
  /** Region-scoped top-N. */
  region:  (region: string, limit = 50) => api.get(`/leaderboard/region/${region}`, { params: { limit } }),
  /** Distinct regions that currently have scored users. */
  regions: ()                           => api.get('/leaderboard/regions'),
  /** The current user's own global standing (rank + points). */
  me:      ()                           => api.get('/leaderboard/me'),
  rankChange: () => api.post('/leaderboard/me/rank-change'),
};
