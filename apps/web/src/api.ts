import type { CareerAttempt, CareerOverview, CareerResult, CareerRole, Course, CourseLessons, HomeData, Lesson, MarketAssetDetail, MarketAssetList, MarketNewsArticle, MarketNewsSummary, MarketPeriod, ProfileData, Quiz, QuizAnswer, QuizResult, ScenarioSummary, SecurityCase, SecurityCaseResult, SecurityCaseSummary, SecurityProgress, SimulationResult, SimulationState, ThreatCard, ThreatSummary } from "./types";

let accessToken = "";

export function setApiAccessToken(token: string) {
  accessToken = token;
}

function authHeaders(): Record<string, string> {
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1${path}`, { signal, headers: authHeaders() });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function sendJson<T>(path: string, method: "POST", body?: unknown, headers?: Record<string, string>): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    method,
    headers: body === undefined ? { ...authHeaders(), ...headers } : { "Content-Type": "application/json", ...authHeaders(), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  maxConfig: () => getJson<{ maxRequired: boolean }>("/auth/config"),
  signInMax: async (initData: string) => {
    const response = await fetch("/api/v1/auth/max", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }),
    });
    if (!response.ok) throw new Error(`MAX sign-in failed: ${response.status}`);
    return response.json() as Promise<{ accessToken: string; user: { id: string; displayName: string } }>;
  },
  home: (signal?: AbortSignal) => getJson<HomeData>("/home", signal),
  courses: (signal?: AbortSignal) => getJson<Course[]>("/courses", signal),
  courseLessons: async (courseId: string, signal?: AbortSignal): Promise<CourseLessons> => {
    const [courses, lessons] = await Promise.all([
      getJson<Course[]>("/courses", signal),
      getJson<CourseLessons["lessons"]>(`/courses/${courseId}/lessons`, signal),
    ]);
    const course = courses.find((item) => item.id === courseId);
    if (!course) throw new Error("Course not found");
    return { course, lessons };
  },
  lesson: (lessonId: string, signal?: AbortSignal) => getJson<Lesson>(`/lessons/${lessonId}`, signal),
  openLesson: (lessonId: string) => sendJson<void>(`/lessons/${lessonId}/open`, "POST"),
  quiz: (lessonId: string, signal?: AbortSignal) => getJson<Quiz>(`/lessons/${lessonId}/quiz`, signal),
  submitQuiz: (quizId: string, answers: QuizAnswer[]) => sendJson<QuizResult>(`/quizzes/${quizId}/submit`, "POST", { answers }),
  marketAssets: (signal?: AbortSignal) => getJson<MarketAssetList>("/market/assets", signal),
  marketAsset: (symbol: string, period: MarketPeriod, signal?: AbortSignal) => getJson<MarketAssetDetail>(`/market/assets/${encodeURIComponent(symbol)}?period=${period}`, signal),
  marketNews: (signal?: AbortSignal) => getJson<MarketNewsSummary[]>("/news", signal),
  marketNewsArticle: (newsId: string, signal?: AbortSignal) => getJson<MarketNewsArticle>(`/news/${encodeURIComponent(newsId)}`, signal),
  securityCases: (signal?: AbortSignal) => getJson<SecurityCaseSummary[]>("/security/cases", signal),
  securityCase: (caseId: string, signal?: AbortSignal) => getJson<SecurityCase>(`/security/cases/${encodeURIComponent(caseId)}`, signal),
  submitSecurityCase: (caseId: string, optionId: string) => sendJson<SecurityCaseResult>(`/security/cases/${encodeURIComponent(caseId)}/submit`, "POST", { optionId }),
  securityProgress: (signal?: AbortSignal) => getJson<SecurityProgress>("/security/progress", signal),
  threats: (signal?: AbortSignal) => getJson<ThreatSummary[]>("/security/threats", signal),
  threat: (threatId: string, signal?: AbortSignal) => getJson<ThreatCard>(`/security/threats/${encodeURIComponent(threatId)}`, signal),
  profile: (signal?: AbortSignal) => getJson<ProfileData>("/profile", signal),
  careerOverview: (signal?: AbortSignal) => getJson<CareerOverview>("/career", signal),
  createCareerAttempt: (restart = false) => sendJson<CareerAttempt>("/career/attempts", "POST", { restart }),
  careerAttempt: (attemptId: string, signal?: AbortSignal) => getJson<CareerAttempt>(`/career/attempts/${encodeURIComponent(attemptId)}`, signal),
  saveCareerAnswer: (attemptId: string, questionId: string, optionId: string) => sendJson<CareerAttempt>(`/career/attempts/${encodeURIComponent(attemptId)}/answers`, "POST", { questionId, optionId }),
  completeCareerAttempt: (attemptId: string) => sendJson<CareerResult>(`/career/attempts/${encodeURIComponent(attemptId)}/complete`, "POST"),
  careerResult: (attemptId: string, signal?: AbortSignal) => getJson<CareerResult>(`/career/results/${encodeURIComponent(attemptId)}`, signal),
  careerRole: (roleId: string, signal?: AbortSignal) => getJson<CareerRole>(`/career/roles/${encodeURIComponent(roleId)}`, signal),
  scenarios: (signal?: AbortSignal) => getJson<ScenarioSummary[]>("/scenarios", signal),
  createSimulation: (scenarioId: string) => sendJson<SimulationState>("/simulations", "POST", { scenarioId }),
  simulationState: (sessionId: string, signal?: AbortSignal) => getJson<SimulationState>(`/simulations/${sessionId}/state`, signal),
  pauseSimulation: (sessionId: string) => sendJson<SimulationState>(`/simulations/${sessionId}/pause`, "POST"),
  resumeSimulation: (sessionId: string) => sendJson<SimulationState>(`/simulations/${sessionId}/resume`, "POST"),
  makeTrade: (sessionId: string, trade: { type: "BUY" | "SELL"; symbol: string; amountRub?: number; quantity?: number }) =>
    sendJson<SimulationState>(`/simulations/${sessionId}/trades`, "POST", trade, { "Idempotency-Key": crypto.randomUUID() }),
  completeSimulation: (sessionId: string) => sendJson<SimulationResult>(`/simulations/${sessionId}/complete`, "POST"),
};
