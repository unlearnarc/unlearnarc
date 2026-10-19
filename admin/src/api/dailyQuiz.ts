import api from './client';
export interface PoolQuality { poolId: string; name: string; activeQuestions: number; missingExplanation: number; invalidKeys: number; topicMappings: number; generalDiagnostic: boolean; introductory: boolean }
export const dailyQuizAdminAPI = {
  quality: async () => (await api.get<{ data: PoolQuality[] }>('/daily-quiz/admin/quality')).data.data,
  policy: (poolId: string, generalDiagnostic: boolean, introductory: boolean) => api.put(`/daily-quiz/admin/pools/${encodeURIComponent(poolId)}`, { generalDiagnostic, introductory }),
};
