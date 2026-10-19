import api from './client';
export interface DailyQuestion {
  id: string; questionId: string; topicId: string; topicName: string; href?: string;
  reason: string; selectionExplanation: string; difficulty: string; questionType: string; text: string;
  options: { id: string; text: string }[]; selectedAnswerIds: string[];
  correct?: boolean; explanation?: string; correctAnswerIds?: string[];
}
export interface DailySession {
  id: string; learningDate: string; timeZone: string; status: string; ruleVersion: string;
  generatedAt: string; startedAt?: string; submittedAt?: string;
  correctCount: number; incorrectCount: number; questions: DailyQuestion[]; notices: string[];
}
export interface DailyInsight {
  topicId: string; name: string; href: string; recommendation: string;
  evidence: { state: string; distinctQuestions: number; confidence: string; nextReview?: string; improving: boolean };
}
const session = async (path: string, body?: unknown) => (await api.post<{ data: DailySession }>(path, body)).data.data;
export const dailyQuizAPI = {
  today: async () => (await api.get<{ data: DailySession | null }>('/daily-quiz/today')).data.data,
  generate: () => session('/daily-quiz/today'),
  get: async (id: string) => (await api.get<{ data: DailySession }>(`/daily-quiz/sessions/${encodeURIComponent(id)}`)).data.data,
  start: (id: string) => session(`/daily-quiz/sessions/${encodeURIComponent(id)}/start`),
  answer: (id: string, item: string, selectedAnswerIds: string[]) => session(`/daily-quiz/sessions/${encodeURIComponent(id)}/answers/${encodeURIComponent(item)}`, { selectedAnswerIds }),
  complete: (id: string) => session(`/daily-quiz/sessions/${encodeURIComponent(id)}/complete`),
  insights: async () => (await api.get<{ data: DailyInsight[] }>('/daily-quiz/insights')).data.data,
  history: async (page: number) => (await api.get<{ data: { content: DailySession[]; last: boolean } }>('/daily-quiz/history', { params: { page } })).data.data,
};
