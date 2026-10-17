import api from './client';

// ── Auth ───────────────────────────────────────────────────────────────────
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  health: () => api.get('/auth/health'),
};

// ── Domains ────────────────────────────────────────────────────────────────
export const domainAPI = {
  getAll: () => api.get('/domains'),
  getById: (id: string) => api.get(`/domains/${id}`),
  create: (data: { name: string }) => api.post('/domains', data),
  update: (id: string, data: { name: string }) => api.put(`/domains/${id}`, data),
  delete: (id: string) => api.delete(`/domains/${id}`),
};

// ── Skills ─────────────────────────────────────────────────────────────────
export const skillAPI = {
  getAll: () => api.get('/skills'),
  getById: (id: string) => api.get(`/skills/${id}`),
  create: (data: { name: string; level: string }) => api.post('/skills', data),
  update: (id: string, data: { name: string; level: string }) =>
    api.put(`/skills/${id}`, data),
  delete: (id: string) => api.delete(`/skills/${id}`),
};

// ── Domain ↔ Skill Mappings ────────────────────────────────────────────────
export const domainSkillAPI = {
  getAll: () => api.get('/domain-skill-mappings'),
  getByDomain: (domainId: string) =>
    api.get(`/domain-skill-mappings/domain/${domainId}`),
  getBySkill: (skillId: string) =>
    api.get(`/domain-skill-mappings/skill/${skillId}`),
  create: (data: { domainId: string; skillId: string }) =>
    api.post('/domain-skill-mappings', data),
  delete: (id: string) => api.delete(`/domain-skill-mappings/${id}`),
};

// ── Courses ────────────────────────────────────────────────────────────────
export const courseAPI = {
  getAll: () => api.get('/courses'),
  getById: (id: string) => api.get(`/courses/${id}`),
  create: (data: Record<string, unknown>) => api.post('/courses', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/courses/${id}`, data),
  delete: (id: string) => api.delete(`/courses/${id}`),
};

// ── Skill ↔ Course Mappings ────────────────────────────────────────────────
export const skillCourseAPI = {
  getByCourse: (courseId: string) =>
    api.get(`/skill-course-mappings/course/${courseId}`),
  getBySkill: (skillId: string) =>
    api.get(`/skill-course-mappings/skill/${skillId}`),
  create: (data: { skillId: string; courseId: string }) =>
    api.post('/skill-course-mappings', data),
  delete: (id: string) => api.delete(`/skill-course-mappings/${id}`),
};

// ── Roles & Roadmap ──────────────────────────────────────────────────────────
export const roleAPI = {
  getAll:    ()                         => api.get('/roles'),
  getById:   (id: string)              => api.get(`/roles/${id}`),
  create:    (data: { name: string; description?: string }) => api.post('/roles', data),
  update:    (id: string, data: { name: string; description?: string }) =>
    api.put(`/roles/${id}`, data),
  delete:    (id: string)              => api.delete(`/roles/${id}`),
  // Role ↔ Domain
  addDomain:    (roleId: string, domainId: string) =>
    api.post('/roles/domains', { roleId, domainId }),
  removeDomain: (roleId: string, domainId: string) =>
    api.delete(`/roles/${roleId}/domains/${domainId}`),
  // Role ↔ Skill (direct)
  addSkill:     (roleId: string, skillId: string) =>
    api.post('/roles/skills', { roleId, skillId }),
  removeSkill:  (roleId: string, skillId: string) =>
    api.delete(`/roles/${roleId}/skills/${skillId}`),
  // Roadmap preview (same endpoint students use)
  roadmap:   (roleId: string)          => api.get(`/roadmap/role/${roleId}`),
};

// ── Topics ─────────────────────────────────────────────────────────────────
export const topicAPI = {
  getAll: () => api.get('/topics'),
  getByCourse: (courseId: string) =>
    api.get(`/topics/course/${courseId}`),
  getById: (id: string) => api.get(`/topics/${id}`),
  create: (data: Record<string, unknown>) => api.post('/topics', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/topics/${id}`, data),
  delete: (id: string) => api.delete(`/topics/${id}`),
};

// ── Study Materials ────────────────────────────────────────────────────────
export const studyMaterialAPI = {
  getByTopic: (topicId: string) =>
    api.get(`/study-materials/topic/${topicId}`),
  getById: (id: string) => api.get(`/study-materials/${id}`),
  create: (data: Record<string, unknown>) => api.post('/study-materials', data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put(`/study-materials/${id}`, data),
  delete: (id: string) => api.delete(`/study-materials/${id}`),
};

// ── Notes (book-style lessons) ───────────────────────────────────────────────
export const noteAPI = {
  // lists return lightweight summaries (no heavy content body)
  getByTopic:  (topicId: string)  => api.get(`/notes/admin/topic/${topicId}`),
  getByCourse: (courseId: string) => api.get(`/notes/admin/course/${courseId}`),
  getById:     (id: string)       => api.get(`/notes/${id}`),
  create:      (data: Record<string, unknown>) => api.post('/notes', data),
  update:      (id: string, data: Record<string, unknown>) => api.put(`/notes/${id}`, data),
  publish:     (id: string, value: boolean) =>
    api.patch(`/notes/${id}/publish?value=${value}`),
  delete:      (id: string)       => api.delete(`/notes/${id}`),
};

// ── Question Pools ─────────────────────────────────────────────────────────
export const poolAPI = {
  getAll:        ()             => api.get('/question-pools'),
  getById:       (id: string)   => api.get(`/question-pools/${id}`),
  getByScope:    (scope: string)=> api.get(`/question-pools/scope/${scope}`),
  getByDomain:   (id: string)   => api.get(`/question-pools/by-domain/${id}`),
  getByCourse:   (id: string)   => api.get(`/question-pools/by-course/${id}`),
  getByTopic:    (id: string)   => api.get(`/question-pools/by-topic/${id}`),
  create:        (data: Record<string, unknown>) => api.post('/question-pools', data),
  update:        (id: string, data: Record<string, unknown>) => api.put(`/question-pools/${id}`, data),
  delete:        (id: string)   => api.delete(`/question-pools/${id}`),
  toggleActive:  (id: string)   => api.patch(`/question-pools/${id}/toggle-active`),
  map:           (data: Record<string, unknown>) => api.post('/question-pools/map', data),
};

// ── Questions ──────────────────────────────────────────────────────────────
export const questionAPI = {
  getByPool:        (poolId: string)                    => api.get(`/questions/pool/${poolId}`),
  getByPoolAndDiff: (poolId: string, diff: string)      => api.get(`/questions/pool/${poolId}/difficulty/${diff}`),
  getById:          (id: string)                        => api.get(`/questions/${id}`),
  create:           (data: Record<string, unknown>)     => api.post('/questions', data),
  bulkCreate:       (data: Record<string, unknown>[])   => api.post('/questions/bulk', data),
  update:           (id: string, data: Record<string, unknown>) => api.put(`/questions/${id}`, data),
  delete:           (id: string)                        => api.delete(`/questions/${id}`),
  toggleActive:     (id: string)                        => api.patch(`/questions/${id}/toggle-active`),
};

// ── Algorithm Visualizer ─────────────────────────────────────────────────────
export const algorithmAPI = {
  getAll:      ()                                     => api.get('/algorithms'),
  getById:     (id: string)                           => api.get(`/algorithms/${id}`),
  getBySlug:   (slug: string)                         => api.get(`/algorithms/slug/${slug}`),
  create:      (data: Record<string, unknown>)        => api.post('/algorithms', data),
  update:      (id: string, data: Record<string, unknown>) => api.put(`/algorithms/${id}`, data),
  validate:    (data: Record<string, unknown>)        => api.post('/algorithms/validate', data),
  publish:     (id: string, value: boolean)           => api.patch(`/algorithms/${id}/publish?value=${value}`),
  delete:      (id: string)                           => api.delete(`/algorithms/${id}`),
};

// ── Contests (admin) ─────────────────────────────────────────────────────────
export const contestAPI = {
  getAll:        ()                                         => api.get('/admin/contests'),
  create:        (data: Record<string, unknown>)           => api.post('/admin/contests', data),
  update:        (id: string, data: Record<string, unknown>) => api.put(`/admin/contests/${id}`, data),
  setStatus:     (id: string, status: string)              => api.patch(`/admin/contests/${id}/status/${status}`),
  delete:        (id: string)                              => api.delete(`/admin/contests/${id}`),
  // problems + test cases
  getProblems:   (contestId: string)                       => api.get(`/admin/contests/${contestId}/problems`),
  addProblem:    (contestId: string, data: Record<string, unknown>) => api.post(`/admin/contests/${contestId}/problems`, data),
  updateProblem: (problemId: string, data: Record<string, unknown>) => api.put(`/admin/contests/problems/${problemId}`, data),
  deleteProblem: (problemId: string)                       => api.delete(`/admin/contests/problems/${problemId}`),
};

// ── Canvas Animation Scenes (admin) ──────────────────────────────────────────
export const animationSceneAPI = {
  // list / fetch
  getAll:       (category?: string) =>
    api.get('/animation-scenes', { params: category ? { category } : {} }),
  getById:      (id: string)                            => api.get(`/animation-scenes/${id}`),
  getBySlug:    (slug: string)                          => api.get(`/animation-scenes/slug/${slug}`),
  // mutate
  create:       (data: Record<string, unknown>)         => api.post('/animation-scenes', data),
  update:       (id: string, data: Record<string, unknown>) => api.put(`/animation-scenes/${id}`, data),
  validate:     (data: Record<string, unknown>)         => api.post('/animation-scenes/validate', data),
  publish:      (id: string, value: boolean)            => api.patch(`/animation-scenes/${id}/publish?value=${value}`),
  delete:       (id: string)                            => api.delete(`/animation-scenes/${id}`),
  // simulators (GENERATED scenes)
  simulators:   ()                                      => api.get('/animation-scenes/simulators'),
  preview:      (kind: string, params?: Record<string, unknown>) =>
    api.post(`/animation-scenes/simulators/${kind}/preview`, params ?? {}),
};

// ── Interview Experiences (admin moderation) ─────────────────────────────────
export const interviewAPI = {
  // ?verified=true|false to filter the moderation queue; omit for all
  getAll:    (verified?: boolean) =>
    api.get('/interview-experiences/admin', {
      params: verified === undefined ? {} : { verified },
    }),
  getById:   (id: string)  => api.get(`/interview-experiences/${id}`),
  verify:    (id: string)  => api.patch(`/interview-experiences/${id}/verify`),
  unverify:  (id: string)  => api.patch(`/interview-experiences/${id}/unverify`),
  delete:    (id: string)  => api.delete(`/interview-experiences/${id}`),
};
