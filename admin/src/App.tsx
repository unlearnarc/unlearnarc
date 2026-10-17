import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DomainsPage } from './pages/DomainsPage';
import { SkillsPage } from './pages/SkillsPage';
import { CoursesPage } from './pages/CoursesPage';
import { QuestionPoolsPage } from './pages/QuestionPoolsPage';
import { InterviewExperiencesPage } from './pages/InterviewExperiencesPage';
import { AlgorithmsPage } from './pages/AlgorithmsPage';
import { AnimationScenesPage } from './pages/AnimationScenesPage';
import { ContestsPage } from './pages/ContestsPage';
import { RolesPage } from './pages/RolesPage';
import { NotesPage } from './pages/NotesPage';
import { AiAuthoringPage } from './pages/AiAuthoringPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="domains" element={<DomainsPage />} />
                <Route path="skills" element={<SkillsPage />} />
                <Route path="roles" element={<RolesPage />} />
                <Route path="courses" element={<CoursesPage />} />
                <Route path="notes" element={<NotesPage />} />
                <Route path="question-pools" element={<QuestionPoolsPage />} />
                <Route path="contests" element={<ContestsPage />} />
                <Route path="interview-experiences" element={<InterviewExperiencesPage />} />
                <Route path="algorithms" element={<AlgorithmsPage />} />
                <Route path="animations" element={<AnimationScenesPage />} />
                <Route path="ai-authoring" element={<AiAuthoringPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--ua-surface-raised)',
              color: 'var(--ua-text-primary)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              fontSize: '13px',
            },
            success: { iconTheme: { primary: 'var(--ua-brand-500)', secondary: '#fff' } },
            error: { iconTheme: { primary: 'var(--ua-danger)', secondary: '#fff' } },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
