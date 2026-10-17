import api from './client';
import type { AnimationTrace } from '../types/animation';

export type AuthoringKind = 'TOPICS' | 'ANIMATION';
export interface AuthoringJob {
  id: string;
  kind: AuthoringKind;
  courseId?: string;
  prompt: string;
  proposal: Record<string, unknown>;
  status: 'DRAFT' | 'SAVED';
  result?: unknown;
  createdAt: string;
}
export interface AuthoringReview { job: AuthoringJob; preview: AnimationTrace | null; }
export const authoringAPI = {
  status: async () => (await api.get<{ data: { configured: boolean } }>('/admin/ai-authoring/status')).data.data,
  history: async () => (await api.get<{ data: AuthoringJob[] }>('/admin/ai-authoring/jobs')).data.data,
  generate: async (request: { kind: AuthoringKind; prompt: string; courseId?: string; count: number }) =>
    (await api.post<{ data: AuthoringJob }>('/admin/ai-authoring/jobs', request, { timeout: 100_000 })).data.data,
  review: async (id: string, proposal: unknown) =>
    (await api.put<{ data: AuthoringReview }>(`/admin/ai-authoring/jobs/${id}`, { proposal })).data.data,
  save: async (id: string) =>
    (await api.post<{ data: AuthoringJob }>(`/admin/ai-authoring/jobs/${id}/save`)).data.data,
};
