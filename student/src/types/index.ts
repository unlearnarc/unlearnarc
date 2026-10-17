// ── Domain & Skill ──────────────────────────────────────────────────────────
export interface Domain {
  id: string;
  name: string;
}

export interface Skill {
  id: string;
  name: string;
  level: SkillLevel;
}

export type SkillLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

// ── Mapping join rows (Domain→Skill→Course) ──────────────────────────────────
export interface DomainSkillMapping {
  id: string;
  domainId: string;
  skillId: string;
}

export interface SkillCourseMapping {
  id: string;
  skillId: string;
  courseId: string;
}

// ── Course ──────────────────────────────────────────────────────────────────
export interface Course {
  id: string;
  name: string;
  imgUrl?: string;
  totalTime?: string;
  topicsCount: number;
  level: CourseLevel;
  qusPool?: string;
}

export type CourseLevel = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';

export interface CourseProgress {
  courseId: string;
  enrolled: boolean;
  completed: boolean;
  progressPercent: number;
  totalTopics: number;
  completedTopics: number;
  bestCourseScore: number | null;
  topics: { topicId: string; topicName: string; completed: boolean; bestScore: number | null }[];
}

// ── Topic ───────────────────────────────────────────────────────────────────
export interface Topic {
  id: string;
  name: string;
  time?: string;
  topicOrder: number;
  level: CourseLevel;
  courseId: string;
}

// ── Study Material ──────────────────────────────────────────────────────────
export interface StudyMaterial {
  id: string;
  type: StudyMaterialType;
  topicId: string;
  url: string;
}

export type StudyMaterialType = 'VIDEO' | 'ARTICLE' | 'PDF' | 'QUIZ' | 'EXERCISE' | 'SLIDES';

// ── Note (book-style, admin-authored lesson rendered in-app) ──────────────────
export interface NoteSummary {
  id: string;
  title: string;
  summary?: string;
  coverImageUrl?: string;
  topicId?: string;
  courseId?: string;
  noteOrder: number;
  readMinutes?: number;
  isPublished: boolean;
  updatedAt: string;
}

export interface Note extends NoteSummary {
  contentHtml: string;
  blocksJson?: string;
  createdAt: string;
}

// ── Question Pool ───────────────────────────────────────────────────────────
export interface QuestionPool {
  id: string;
  name: string;
  description?: string;
  scopeType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  totalQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  passPercentage: number;
  timeLimitMinutes?: number;
  isActive: boolean;
  activeQuestionCount?: number;
  easyAvailable?: number;
  mediumAvailable?: number;
  hardAvailable?: number;
}

// ── Question ─────────────────────────────────────────────────────────────────
export interface Question {
  id: string;
  poolId: string;
  questionText: string;
  questionType: 'MCQ' | 'MULTIPLE_CORRECT';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  explanation?: string;
  isActive: boolean;
  answers: Answer[];
}

export interface Answer {
  id: string;
  answerText: string;
  isCorrect?: boolean; // hidden during test
}

// ── Test Engine ──────────────────────────────────────────────────────────────
export interface TestGenerationRequest {
  scopeType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  entityId: string;
  poolId?: string;
  /**
   * When true the backend personalises the difficulty mix from the learner's
   * past attempts on this scope (Tests-page "Generate" flow). Omit/false for the
   * plain topic/course/domain quiz flow (fixed pool mix, union of child pools).
   */
  adaptive?: boolean;
}

export interface TestQuestion {
  id: string;
  questionText: string;
  questionType: 'MCQ' | 'MULTIPLE_CORRECT';
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  points: number;
  answers: { id: string; answerText: string }[];
}

export interface TestSession {
  poolId: string;
  poolName: string;
  scopeType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  entityId: string;
  totalQuestions: number;
  easyCount: number;
  mediumCount: number;
  hardCount: number;
  timeLimitMinutes?: number;
  passPercentage: number;
  totalPoints: number;
  /**
   * How this session was selected, for UI messaging:
   *  - DEFAULT / DEFAULT_NO_HISTORY → fixed pool mix (direct quiz, or adaptive
   *    with no prior attempts yet)
   *  - MASTERY   → learner is acing this scope → harder, broadened set
   *  - ADVANCING → doing well → more hard questions
   *  - REINFORCE → still building up → easier/medium-weighted set
   */
  strategy?: 'DEFAULT' | 'DEFAULT_NO_HISTORY' | 'MASTERY' | 'ADVANCING' | 'REINFORCE';
  questions: TestQuestion[];
}

export interface TestSubmission {
  poolId: string;
  entityId: string;
  /** The scope the learner tested against — recorded so history shows the real
   *  entity (topic/course/domain) name, not the resolved child pool's scope. */
  scopeType?: 'DOMAIN' | 'COURSE' | 'TOPIC';
  answers: { questionId: string; selectedAnswerIds: string[] }[];
}

export interface TestResultResponse {
  poolId: string;
  poolName: string;
  scopeType: string;
  entityId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  skippedAnswers: number;
  totalPoints: number;
  earnedPoints: number;
  percentageScore: number;
  passed: boolean;
  passPercentage: number;
  timeTakenSeconds?: number;
  breakdown: QuestionResult[];
}

export interface QuestionResult {
  questionId: string;
  questionText: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  questionType: string;
  points: number;
  earnedPoints: number;
  isCorrect: boolean;
  selectedAnswerIds: string[];
  correctAnswerIds: string[];
  explanation?: string;
  answers: { id: string; answerText: string; isCorrect: boolean }[];
}

// ── Test History ──────────────────────────────────────────────────────────────
export interface TestAttemptSummary {
  attemptId: string;
  resultId: string;
  poolId: string;
  poolName: string;
  entityType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  entityId: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  earnedPoints: number;
  totalPoints: number;
  scorePercentage: number;
  passPercentage: number;
  passed: boolean;
  improvementNeeded: boolean;
  timeTakenSeconds?: number;
  attemptedAt: string;
}

export interface TestAttemptDetail {
  attemptId: string;
  resultId: string;
  attemptedAt: string;
  timeTakenSeconds?: number;
  result: TestResultResponse;
}

// ── Test Insights (backend-computed analytics) ─────────────────────────────────
export type TrendLabel = 'IMPROVING' | 'DECLINING' | 'STEADY' | 'INSUFFICIENT_DATA';
export type InsightSeverity = 'CRITICAL' | 'NEEDS_WORK' | 'ON_TRACK';
export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

export interface DifficultyAccuracy {
  difficulty: Difficulty;
  total: number;
  correct: number;
  accuracy: number;        // 0–100
}

export interface InsightScorePoint {
  attemptedAt: string;
  scorePercentage: number;
  poolName: string;
}

export interface WeakAreaHighlight {
  entityType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  entityId: string;
  entityName: string;
  poolName: string;
  averageScore: number;
  attempts: number;
}

export interface InsightsDashboard {
  totalAttempts: number;
  totalQuestionsAnswered: number;
  totalCorrect: number;
  averageScore: number;
  bestScore: number;
  latestScore: number;
  passRate: number;
  trendDelta: number;
  trendLabel: TrendLabel;
  totalTimeSeconds: number;
  difficultyAccuracy: DifficultyAccuracy[];
  recentScores: InsightScorePoint[];
  topWeakArea?: WeakAreaHighlight;
}

export interface WeakArea {
  entityType: 'DOMAIN' | 'COURSE' | 'TOPIC';
  entityId: string;
  entityName: string;
  poolName: string;
  attempts: number;
  averageScore: number;    // 0–100
  bestScore: number;
  accuracy: number;        // 0–100
  passRate: number;        // 0–100
  severity: InsightSeverity;
  recommendation: string;
}

export interface DifficultyGap {
  difficulty: Difficulty;
  totalAnswered: number;
  correct: number;
  accuracy: number;        // 0–100
  severity: InsightSeverity;
  recommendation: string;
}

export interface RecurringMistake {
  questionId: string;
  questionText: string;
  difficulty: Difficulty;
  timesSeen: number;
  timesWrong: number;
  wrongRate: number;       // 0–100
  poolName: string;
  recommendation: string;
}

export interface ImprovementReport {
  attemptsAnalyzed: number;
  summary: string;
  weakAreas: WeakArea[];
  difficultyGaps: DifficultyGap[];
  recurringMistakes: RecurringMistake[];
}

/** Spring Data Page envelope (subset we consume). */
export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

// ── User ─────────────────────────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  name: string;
  email: string;
  region?: string;
  rank?: number;
  points?: number;
  profilePicture?: string;
  authProvider?: string;
  isActive?: boolean;
  // ── daily-activity streak ──
  currentStreak?: number;
  longestStreak?: number;
  lastActivityDate?: string | null;
  // ── Coach Buddy (mascot companion) preferences ──
  mascotCharacter?: string;
  mascotVibe?: 'friend' | 'companion';
  mascotMuted?: boolean;
  // ── Accessibility: read-aloud (text-to-speech) ──
  ttsEnabled?: boolean;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  active: boolean;
  activeToday: boolean;
}

export interface StreakCalendar {
  from: string;                 // yyyy-MM-dd
  to: string;                   // yyyy-MM-dd
  activeDays: string[];         // yyyy-MM-dd[]
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  active: boolean;
  activeDayCount: number;
}

// ── Interview Experience ─────────────────────────────────────────────────────
export interface InterviewExperience {
  id: string;
  userId: string;
  authorName?: string;
  isPassed: boolean;
  company: string;
  city?: string;
  role: string;
  experience: string;
  isVerified: boolean;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewExperienceRequest {
  isPassed: boolean;
  company: string;
  city?: string;
  role: string;
  experience: string;
}

// ── Contest ──────────────────────────────────────────────────────────────────
export type ContestStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type ContestVisibility = 'PUBLIC' | 'PRIVATE';
/** DRAFT|PUBLISHED|ARCHIVED combined with the time window. */
export type ContestPhase = 'UPCOMING' | 'RUNNING' | 'ENDED';
export type ProblemDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type HarnessType = 'STDIN_STDOUT' | 'FUNCTION_RETURN';
export type SubmissionVerdict =
  | 'ACCEPTED' | 'PARTIAL' | 'WRONG_ANSWER' | 'TIME_LIMIT'
  | 'RUNTIME_ERROR' | 'COMPILE_ERROR' | 'MALFORMED';

export interface Contest {
  id: string;
  title: string;
  slug: string;
  description?: string;
  status: ContestStatus;
  visibility: ContestVisibility;
  startTime?: string;
  endTime?: string;
  durationMinutes: number;
  /** CSV e.g. "python,javascript,cpp". */
  allowedLanguages: string;
  wrongSubmissionPenalty: number;
  createdBy?: string;
  createdAt?: string;
  problemCount: number;
  participantCount: number;
  phase: ContestPhase;
}

export interface PublicTestCase {
  id: string;
  input: string;
  expectedOutput: string;
  displayOrder: number;
}

export interface ContestProblem {
  id: string;
  contestId: string;
  title: string;
  statement: string;
  constraints?: string;
  difficulty: ProblemDifficulty;
  maxPoints: number;
  /** JSON string: {"python":"...","javascript":"..."}. */
  starterCodeJson?: string;
  harnessType: HarnessType;
  timeLimitMs: number;
  displayOrder: number;
  sampleTestCases: PublicTestCase[];
  hiddenTestCount: number;
}

export interface ChallengeCase {
  testCaseId: string;
  input: string;
  isHidden: boolean;
  displayOrder: number;
  /** "<issuedAt>.<hmac>" — must be echoed back on submit. */
  signature: string;
}

export interface Challenge {
  problemId: string;
  harnessType: HarnessType;
  timeLimitMs: number;
  cases: ChallengeCase[];
}

/** One locally-executed test outcome the client reports back to the server. */
export interface TestOutcome {
  testCaseId: string;
  signature: string;
  input: string;
  producedOutput: string;
  clientStatus?: 'OK' | 'TIMEOUT' | 'RUNTIME_ERROR' | 'COMPILE_ERROR';
  runtimeMs?: number;
}

export interface SubmissionRequest {
  problemId: string;
  language: string;
  sourceCode?: string;
  results: TestOutcome[];
}

export interface CaseVerdict {
  testCaseId: string;
  passed: boolean;
  displayOrder: number;
  expectedOutput?: string;
  producedOutput?: string;
}

export interface SubmissionResponse {
  submissionId: string;
  problemId: string;
  verdict: SubmissionVerdict;
  passedTests: number;
  totalTests: number;
  score: number;
  maxPoints: number;
  scoreDelta: number;
  participantTotalScore: number;
  runtimeMs?: number;
  caseVerdicts: CaseVerdict[];
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  totalScore: number;
  solvedCount: number;
  penalty: number;
  lastAcceptedAt?: string;
}

// ── API wrapper ──────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}
