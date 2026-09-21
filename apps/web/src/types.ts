export type ProgressSummary = {
  completedLessons: number;
  totalLessons: number;
  percent: number;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  lessonCount: number;
  accent: "violet" | "blue" | "purple" | "coral";
  progress: ProgressSummary;
};

export type LessonSummary = {
  id: string;
  courseId: string;
  title: string;
  shortDescription: string;
  durationMinutes: number;
  pageCount: number;
  order: number;
  status: "NOT_STARTED" | "OPENED" | "COMPLETED";
};

export type LessonSection = {
  type: "TEXT" | "EXAMPLE" | "KEY_TAKEAWAY" | "RISK" | "BULLETS";
  title?: string;
  body: string;
};

export type Lesson = LessonSummary & {
  sections: LessonSection[];
  pages: LessonPage[];
  robotTip: string;
  quizId: string;
};

export type LessonPage =
  | {
      id: string;
      kind: "CONTENT";
      sectionType: LessonSection["type"];
      eyebrow: string;
      title: string;
      body: string;
      illustration?: {
        src: string;
        alt: string;
        caption?: string;
      };
    }
  | {
      id: string;
      kind: "CHECKPOINT";
      eyebrow: string;
      title: string;
      question: {
        text: string;
        options: Array<{ id: string; text: string }>;
        correctOptionId: string;
        explanation: string;
      };
    };

export type Quiz = {
  id: string;
  lessonId: string;
  lessonTitle: string;
  title: string;
  questions: Array<{
    id: string;
    text: string;
    type: "SINGLE_CHOICE";
    options: Array<{ id: string; text: string }>;
  }>;
};

export type QuizAnswer = { questionId: string; optionIds: string[] };

export type QuizResult = {
  lessonId: string;
  courseId: string;
  correctAnswers: number;
  totalQuestions: number;
  scorePercent: number;
  passed: boolean;
  passingScorePercent: number;
  completedLesson: boolean;
  details: Array<{
    questionId: string;
    questionText: string;
    correct: boolean;
    explanation: string;
    correctOptionIds: string[];
    selectedOptionText: string;
    correctOptionText: string;
  }>;
  courseProgress: ProgressSummary;
  overallProgress: ProgressSummary;
  nextLessonId: string | null;
};

export type CourseLessons = { course: Course; lessons: LessonSummary[] };

export type MarketAsset = {
  symbol: string;
  name: string;
  priceRub: number;
  change24hPercent: number;
  sourceTimestamp: string;
  isStale: boolean;
  sparklineRub: number[];
  accent: string;
};

export type MarketAssetList = {
  assets: MarketAsset[];
  isStale: boolean;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  notice?: string;
};

export type MarketPeriod = "1D" | "1W" | "1M" | "3M";

export type MarketAssetDetail = MarketAsset & {
  description: string;
  period: MarketPeriod;
  series: Array<{ at: string; priceRub: number }>;
  highPeriodRub: number | null;
  lowPeriodRub: number | null;
  chartIsStale: boolean;
  chartUnavailable: boolean;
  chartSource: string | null;
  chartSourceUrl: string | null;
  chartNote?: string;
  sources: Array<{ name: string; priceRub: number; updatedAt: string; note: string }>;
  source: string;
  sourceUrl: string;
  updatedAt: string;
  educationalNote: string;
};

export type MarketNewsSummary = {
  id: string;
  title: string;
  preview: string;
  category: "MARKET" | "LAW" | "SECURITY" | "TECHNOLOGY";
  publishedAt: string;
  affectedAssets: string[];
};

export type MarketNewsArticle = MarketNewsSummary & {
  whatHappened: string;
  whyImportant: string;
  analysis: string;
  takeaway: string;
  sourceName: string;
  sourceUrl: string;
  disclaimer: string;
};

export type SecurityCaseSummary = {
  id: string;
  title: string;
  shortDescription: string;
  order: number;
  difficulty: "BEGINNER" | "INTERMEDIATE";
  estimatedMinutes: number;
  completed: boolean;
};

export type SecurityCase = SecurityCaseSummary & {
  scenarioText: string;
  context: string;
  options: Array<{ id: string; text: string }>;
};

export type SecurityCaseResult = {
  caseId: string;
  selectedOptionId: string;
  safetyLevel: "SAFE" | "RISKY";
  feedback: string;
  consequences: string;
  redFlags: string[];
  takeaway: string;
  threatIds: string[];
  nextCaseId: string | null;
  completed: true;
};

export type SecurityProgress = {
  completedCaseIds: string[];
  completedCases: number;
  totalCases: number;
  percent: number;
};

export type ThreatSummary = {
  id: string;
  title: string;
  slug: string;
  definition: string;
};

export type ThreatCard = ThreatSummary & {
  howItWorks: string;
  signs: string[];
  example: string;
  protection: string[];
  neverDo: string[];
};

export type ProfileData = {
  user: { id: string; displayName: string };
  level: string;
  robotMessage: string;
  overallProgress: ProgressSummary;
  courses: Course[];
  lastLesson: {
    id: string;
    title: string;
    courseId: string;
    courseTitle: string;
    status: "NOT_STARTED" | "OPENED" | "COMPLETED";
    progressPercent: number;
  };
  quizStats: {
    attemptCount: number;
    bestScore: number;
    lastScore: number | null;
    results: Array<{
      lessonId: string;
      lessonTitle: string;
      courseTitle: string;
      bestScore: number;
      lastScore: number;
      lastAttemptAt: string;
      attemptCount: number;
    }>;
  };
  security: SecurityProgress & { threatCount: number };
  simulations: {
    completedCount: number;
    totalTrades: number;
    items: Array<{
      sessionId: string;
      scenarioId: string;
      scenarioTitle: string;
      completedAt: string | null;
      returnPercent: number;
      benchmarkReturnPercent: number;
      deltaPercent: number;
      finalValueRub: number;
      tradeCount: number;
    }>;
  };
  achievements: {
    unlocked: number;
    total: number;
    items: Array<{
      id: string;
      code: string;
      title: string;
      description: string;
      icon: "BOOK" | "STAR" | "SHIELD" | "CHART" | "LAYERS" | "TARGET" | "CHECK";
      unlocked: boolean;
      progress: number;
      target: number;
    }>;
  };
};

export type HomeData = {
  user: { id: string; displayName: string };
  continueLesson: {
    id: string;
    courseId: string;
    courseTitle: string;
    title: string;
    lessonNumber: number;
    totalCourseLessons: number;
    status: string;
    progressPercent: number;
  };
  overallProgress: ProgressSummary;
  market: { assets: MarketAsset[]; isStale: boolean; source: string };
  latestNews: {
    id: string;
    title: string;
    preview: string;
    category: string;
    publishedAt: string;
  };
  robotTip: string;
};

export type ScenarioSummary = {
  id: string;
  version: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  startingBalanceRub: number;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  educationalFocus: string[];
  benchmark: { kind: "BUY_AND_HOLD"; assetSymbol: string; label: string };
  estimatedMinutes: number;
  assetSymbols: string[];
  eventCount: number;
  dataSource: { name: string; url: string; retrievedAt: string };
};

export type SimulationTrade = {
  id: string;
  type: "BUY" | "SELL";
  symbol: string;
  quantity: number;
  amountRub: number;
  priceRub: number;
  scenarioAt: string;
  triggerEventId: string | null;
};

export type SimulationEvent = {
  id: string;
  at: string;
  title: string;
  summary: string;
  context: string;
  category: "MARKET" | "WORLD" | "REGULATION" | "TECHNOLOGY" | "SECURITY" | "COMPANY";
  affectedAssets: string[];
  sourceName: string;
  sourceUrl: string;
};

export type SimulationResult = {
  schemaVersion: 2;
  sessionId: string;
  finalValueRub: number;
  returnPercent: number;
  benchmarkReturnPercent: number;
  benchmarkLabel?: string;
  deltaPercent: number;
  tradeCount: number;
  analysis: Array<{ kind: string; title: string; text: string }>;
  portfolioSeries: Array<{ at: string; totalValueRub: number; cashRub: number }>;
  decisions: Array<{
    tradeId: string;
    type: "BUY" | "SELL";
    symbol: string;
    quantity: number;
    amountRub: number;
    priceRub: number;
    scenarioAt: string;
    portfolioValueAfterRub: number;
    triggerEvent: Pick<SimulationEvent, "id" | "title" | "at" | "category"> | null;
    daysAfterEvent: number | null;
    marketMoveBeforePercent: number;
    drawdownFromRecentPeakPercent: number;
    signals: Array<"FOMO" | "PANIC_SELL" | "DROP_REACTION" | "NEWS_REACTION">;
  }>;
  comparison: {
    attemptNumber: number;
    previousAttempts: number;
    previousReturnPercent: number | null;
    deltaVsPreviousPercent: number | null;
    bestPreviousReturnPercent: number | null;
    averagePreviousReturnPercent: number | null;
  };
};

export type SimulationState = {
  sessionId: string;
  scenarioId: string;
  scenarioTitle: string;
  scenarioDifficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  educationalFocus: string[];
  benchmark: { kind: "BUY_AND_HOLD"; assetSymbol: string; label: string };
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  scenarioAt: string;
  startAt: string;
  endAt: string;
  progressPercent: number;
  startingBalanceRub: number;
  cashRub: number;
  holdingsValueRub: number;
  totalValueRub: number;
  positions: Array<{ symbol: string; name: string; quantity: number; currentPriceRub: number; valueRub: number }>;
  assets: Array<{
    symbol: string;
    name: string;
    color: string;
    currentPriceRub: number;
    series: Array<{ at: string; priceRub: number }>;
  }>;
  events: SimulationEvent[];
  trades: SimulationTrade[];
  canComplete: boolean;
  result: SimulationResult | null;
};

export type CareerRole = {
  id: string;
  title: string;
  shortDescription: string;
  dailyTasks: string[];
  challenge: string;
  entrySkills: string[];
  learningPath: string[];
  practiceTask: string;
  accent: string;
  disclaimer: string | null;
};

export type CareerOverview = {
  title: string;
  description: string;
  estimatedMinutes: number;
  questionCount: number;
  roleCount: number;
  blocks: Array<{ number: number; title: string; questionCount: number }>;
  roles: CareerRole[];
  activeAttempt: { id: string; answeredCount: number; totalQuestions: number } | null;
  latestResult: {
    attemptId: string;
    completedAt: string;
    headline: string;
    topRoles: Array<{ role: CareerRole; fitPercent: number }>;
  } | null;
};

export type CareerQuestion = {
  id: string;
  order: number;
  block: number;
  blockTitle: string;
  type: "SCALE_INTEREST" | "SCALE_SELF" | "SINGLE_CHOICE";
  text: string;
  options: Array<{ id: string; text: string }>;
};

export type CareerAttempt = {
  id: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  completedAt: string | null;
  answeredCount: number;
  totalQuestions: number;
  answers: Record<string, string>;
  questions: CareerQuestion[];
  resultReady: boolean;
};

export type CareerResult = {
  attemptId: string;
  completedAt: string;
  headline: string;
  summary: string;
  quality: { level: "STABLE" | "CLOSE" | "MIXED"; label: string; text: string };
  topRoles: Array<{ role: CareerRole; fitPercent: number; reasons: string[]; challenge: string }>;
  allRoleScores: Array<{ roleId: string; title: string; fitPercent: number }>;
  dimensions: Array<{ id: string; label: string; value: number; description: string }>;
  disclaimer: string;
};
