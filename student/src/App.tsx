import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MascotProvider, CoachBuddy } from './components/mascot';
import { TtsProvider } from './tts/TtsContext';
import { ProtectedRoute } from './router/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { LandingPage }       from './pages/LandingPage';
import { LoginPage }         from './pages/LoginPage';
import { AuthCallbackPage }  from './pages/AuthCallbackPage';
import { DashboardPage }     from './pages/DashboardPage';
import { ExplorePage }       from './pages/ExplorePage';
import { CourseDetailPage }  from './pages/CourseDetailPage';
import { MyCoursesPage }     from './pages/MyCoursesPage';
import { TestsPage }         from './pages/TestsPage';
import { ProfilePage }       from './pages/ProfilePage';
import { AlgorithmsPage }      from './pages/AlgorithmsPage';
import { AlgorithmDetailPage } from './pages/AlgorithmDetailPage';
import { AnimationsPage }      from './pages/AnimationsPage';
import { InterviewExperiencesPage } from './pages/InterviewExperiencesPage';
import { ContestsPage }      from './pages/ContestsPage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import { LeaderboardPage }   from './pages/LeaderboardPage';
import { RoadmapPage }       from './pages/RoadmapPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <AuthProvider>
      <TtsProvider>
      <MascotProvider>
        <BrowserRouter>
          <Routes>
            {/* Public (no layout) */}
            <Route path="/"               element={<LandingPage />} />
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/auth/callback"  element={<AuthCallbackPage />} />

            {/* Public, but inside the shared sidebar layout.
                The sidebar renders a sign-in prompt when unauthenticated. */}
            <Route element={<AppLayout />}>
              <Route path="/explore"          element={<ExplorePage />} />
              <Route path="/algorithms"       element={<AlgorithmsPage />} />
              <Route path="/algorithms/:slug" element={<AlgorithmDetailPage />} />
              <Route path="/animations"       element={<AnimationsPage />} />

              {/* TEMP: contest is auth-less in the frontend while debugging the
                  WASM sandbox (Google login redirects back to localhost and blocks
                  testing). Move these two routes back under <ProtectedRoute> below
                  once auth/redirect is sorted. */}
              <Route path="/contests"     element={<ContestsPage />} />
              <Route path="/contests/:id" element={<ContestDetailPage />} />
            </Route>

            {/* Protected — authenticated users */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard"            element={<DashboardPage />} />
                <Route path="/courses/:id"          element={<CourseDetailPage />} />
                <Route path="/my-courses"           element={<MyCoursesPage />} />
                <Route path="/tests"                element={<TestsPage />} />
                <Route path="/leaderboard"         element={<LeaderboardPage />} />
                <Route path="/roadmap"              element={<RoadmapPage />} />
                <Route path="/interview-experiences" element={<InterviewExperiencesPage />} />
                <Route path="/profile"              element={<ProfilePage />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--ua-surface)',
              color: 'var(--ua-text-primary)',
              border: '1px solid var(--ua-border)',
              borderRadius: '10px',
              fontSize: '13px',
              boxShadow: 'var(--ua-shadow-hover)',
            },
            success: { iconTheme: { primary: 'var(--ua-success)', secondary: 'var(--ua-surface)' } },
            error:   { iconTheme: { primary: 'var(--ua-danger)',  secondary: 'var(--ua-surface)' } },
          }}
        />

        {/* Floating motivational mascot — reacts to learning events */}
        <CoachBuddy />
      </MascotProvider>
      </TtsProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
