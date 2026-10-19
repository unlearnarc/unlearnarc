import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dailyQuizAdminAPI } from '../api/dailyQuiz';
import type { PoolQuality } from '../api/dailyQuiz';
export function DailyQuizQuality() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: ['daily-pool-quality'], queryFn: dailyQuizAdminAPI.quality });
  const mutation = useMutation({ mutationFn: (p: PoolQuality) => dailyQuizAdminAPI.policy(p.poolId, p.generalDiagnostic, p.introductory), onSuccess: () => qc.invalidateQueries({ queryKey: ['daily-pool-quality'] }) });
  return <details className="mb-6 p-4 border border-white/10 rounded-xl text-slate-300">
    <summary className="cursor-pointer font-semibold">Daily Quiz eligibility and question-bank quality</summary>
    <p className="text-sm my-3">Only opt in verified introductory material or general computer science diagnostic pools. Exactly one topic mapping is required. Existing studied topics need no opt-in. Use the existing pool editor below to repair question quality.</p>
    {query.isPending && <p role="status">Loading coverage…</p>}
    {query.isError && <p role="alert">Coverage unavailable. <button onClick={() => void query.refetch()}>Retry</button></p>}
    {mutation.isError && <p role="alert">Could not save eligibility. Verify the pool has exactly one topic mapping.</p>}
    <div className="max-h-96 overflow-auto">{query.data?.map(p => <article key={p.poolId} className="py-3 border-t border-white/10">
      <h3 className="font-medium">{p.name}</h3><p className="text-sm">{p.activeQuestions} active · {p.topicMappings} topic mappings · {p.missingExplanation} missing explanations · {p.invalidKeys} invalid answer keys{p.activeQuestions < 3 ? ' · Limited question coverage' : ''}</p>
      <div className="flex gap-4 flex-wrap mt-2"><label><input type="checkbox" checked={p.generalDiagnostic} disabled={mutation.isPending || p.topicMappings !== 1} onChange={e => mutation.mutate({ ...p, generalDiagnostic: e.target.checked })} /> General diagnostic: {p.name}</label><label><input type="checkbox" checked={p.introductory} disabled={mutation.isPending || p.topicMappings !== 1} onChange={e => mutation.mutate({ ...p, introductory: e.target.checked })} /> Introductory: {p.name}</label></div>
    </article>)}</div>
  </details>;
}
