import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// import { useLocation } from 'react-router-dom'; // Restore with RoutedStudyBuddy.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
// Keep the event context for existing learning hooks while mascot UI is paused.
import { MascotProvider } from './components/mascot';
// import { CoachBuddy } from './components/mascot';
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
import { PublicProfilePage } from './pages/PublicProfilePage';
import { StudyPlanPage } from './pages/StudyPlanPage';
import { DailyQuizPage } from './pages/DailyQuizPage';
import { AlgorithmsPage }      from './pages/AlgorithmsPage';
import { AlgorithmDetailPage } from './pages/AlgorithmDetailPage';
import { AnimationsPage }      from './pages/AnimationsPage';
import { InterviewExperiencesPage } from './pages/InterviewExperiencesPage';
import { LabsPage } from './pages/LabsPage';
import { ContestsPage }      from './pages/ContestsPage';
import { ContestDetailPage } from './pages/ContestDetailPage';
import { LeaderboardPage }   from './pages/LeaderboardPage';
import { RoadmapPage }       from './pages/RoadmapPage';
// import { MascotPreviewPage } from './pages/MascotPreviewPage';

const qc = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/* Mascot UI temporarily paused; retain this connection for restoration.
function RoutedStudyBuddy() {
  const { pathname } = useLocation();
  return pathname === '/' ? null : <CoachBuddy />;
}
*/

function App() {
  return (
    <QueryClientProvider client={qc}>
      <ThemeProvider>
      <AuthProvider>
      <MascotProvider>
        <BrowserRouter>
          <Routes>
            {/* Public (no layout) */}
            <Route path="/"               element={<LandingPage />} />
            <Route path="/login"          element={<LoginPage />} />
            <Route path="/p/:token"        element={<PublicProfilePage />} />
            <Route path="/auth/callback"  element={<AuthCallbackPage />} />

            {/* All app pages require a session, including direct/deep links. */}
            <Route element={<ProtectedRoute />}>
              {/* Mascot UI temporarily paused.
              <Route path="/mascot-preview" element={<MascotPreviewPage />} />
              */}
              <Route element={<AppLayout />}>
                <Route path="/explore"          element={<ExplorePage />} />
                <Route path="/algorithms"       element={<AlgorithmsPage />} />
                <Route path="/algorithms/:slug" element={<AlgorithmDetailPage />} />
                <Route path="/animations"       element={<AnimationsPage />} />
                <Route path="/contests"         element={<ContestsPage />} />
                <Route path="/contests/:id"     element={<ContestDetailPage />} />
                <Route path="/dashboard"            element={<DashboardPage />} />
                <Route path="/courses/:id"          element={<CourseDetailPage />} />
                <Route path="/my-courses"           element={<MyCoursesPage />} />
                <Route path="/study-plan"           element={<StudyPlanPage />} />
                <Route path="/daily-quiz"           element={<DailyQuizPage />} />
                <Route path="/tests"                element={<TestsPage />} />
                <Route path="/leaderboard"         element={<LeaderboardPage />} />
                <Route path="/roadmap"              element={<RoadmapPage />} />
                <Route path="/interview-experiences" element={<InterviewExperiencesPage />} />
                <Route path="/labs" element={<LabsPage />} />
                <Route path="/profile"              element={<ProfilePage />} />
              </Route>
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          {/* Mascot UI temporarily paused: <RoutedStudyBuddy /> */}
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

      </MascotProvider>
      </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
