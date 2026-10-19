import api from './client';
export interface StudyPreferences {
  domainIds: string[]; goal: string; skillLevel: string; dailyMinutes: number;
  studyDays: number[]; courseMode: string; courseIds: string[]; timeZone: string;
}
export interface StudyCatalog {
  domains: { id: string; name: string }[];
  courses: { id: string; name: string; description: string; level: string; domainIds: string[]; topics: number }[];
}
export interface StudyTask {
  id: string; topicId: string; title: string; courseName: string; taskType: string; activity: string;
  scheduledDate: string; originalLearningDate: string; revisionInterval: number; estimatedMinutes: number;
  completedAt?: string; available: boolean; href?: string; noteId?: string;
}
export interface StudyDashboard {
  preferences?: StudyPreferences; planId?: string; generationVersion: number; today: string;
  todayTasks: StudyTask[]; overdueTasks: StudyTask[]; weekTasks: StudyTask[]; upcomingRevisions: StudyTask[];
  summary: { completed: number; remaining: number; revisionCompletionRate: number; activeTopics: number };
}
export const studyPlanAPI = {
  catalog: async () => (await api.get<{ data: StudyCatalog }>('/study-plan/catalog')).data.data,
  dashboard: async (weekStart?: string) => (await api.get<{ data: StudyDashboard }>('/study-plan', { params: { weekStart } })).data.data,
  save: (preferences: StudyPreferences, replaceFuture: boolean) => api.put('/study-plan/preferences', preferences, { params: { replaceFuture } }),
  generate: (replaceFuture = false) => api.post('/study-plan/generate', { replaceFuture }),
  complete: (id: string) => api.post(`/study-plan/tasks/${encodeURIComponent(id)}/complete`),
};
