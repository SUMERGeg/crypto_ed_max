import express, { type Response } from "express";
import { randomUUID } from "node:crypto";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";
import {
  getCourse,
  getCourses,
  getHome,
  getLesson,
  getLessons,
  getQuizByLesson,
  initializeLearningState,
  openLesson,
  submitQuiz,
  user,
} from "./data.js";
import { createProgressRepository } from "./persistence.js";
import {
  completeSimulation,
  configureSimulationRepository,
  createSimulation,
  getSimulationState,
  listCompletedSimulations,
  listScenarios,
  makeTrade,
  pauseSimulation,
  resumeSimulation,
} from "./simulation.js";
import { createSimulationRepository } from "./simulation-persistence.js";
import { getMarketAssetDetail, getMarketAssets } from "./market-data.js";
import { getMarketNews, listMarketNews } from "./market-news.js";
import { configureSecurityRepository, getSecurityCase, getSecurityProgress, getThreat, listSecurityCases, listThreats, submitSecurityCase } from "./security-data.js";
import { createSecurityRepository } from "./security-persistence.js";
import { getFullProfile } from "./profile-data.js";
import {
  completeCareerAttempt,
  createCareerAttempt,
  getCareerAttempt,
  getCareerOverview,
  getCareerResult,
  getCareerRole,
  initializeCareerState,
  saveCareerAnswer,
} from "./career-data.js";
import { createCareerRepository } from "./career-persistence.js";
import { createGuestSession, createMaxSession, resolveApiUser, verifyGuestSession, verifyMaxInitData, type AppUser } from "./max-auth.js";
import { createOnboardingRepository, type OnboardingStatus } from "./onboarding-persistence.js";
import { buildRecommendedRoute } from "./route-data.js";

try {
  loadEnvFile(fileURLToPath(new URL("../../../.env", import.meta.url)));
} catch {
  // .env is optional; deployed environments provide variables directly.
}

const app = express();
const port = Number(process.env.PORT ?? 4100);
const botToken = process.env.MAX_BOT_TOKEN?.trim() ?? "";
if (process.env.NODE_ENV === "production" && !botToken) {
  throw new Error("MAX_BOT_TOKEN is required in production");
}
if (botToken && process.env.NODE_ENV === "production" && !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for MAX users in production");
}
const webDistPath = fileURLToPath(new URL("../../web/dist", import.meta.url));
const webIndexPath = fileURLToPath(new URL("../../web/dist/index.html", import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/api/v1/health", (_request, response) => {
  response.json({ status: "ok", service: "crypto-education-api" });
});

app.get("/api/v1/auth/config", (_request, response) => {
  response.set("Cache-Control", "no-store").json({ maxRequired: Boolean(botToken) });
});

app.post("/api/v1/auth/max", async (request, response) => {
  if (!botToken) {
    response.status(503).json({ message: "MAX authentication is not configured" });
    return;
  }
  const initData = request.body?.initData;
  const currentUser = typeof initData === "string" ? verifyMaxInitData(initData, botToken) : null;
  if (!currentUser) {
    response.status(401).json({ message: "Invalid MAX launch data" });
    return;
  }
  await progressRepository.getSnapshot(currentUser.id, currentUser.displayName);
  response.set("Cache-Control", "no-store").json({ accessToken: createMaxSession(currentUser, botToken), user: currentUser });
});

app.post("/api/v1/auth/guest", async (request, response) => {
  if (!botToken) {
    response.status(503).json({ message: "Guest access is not configured" });
    return;
  }
  const authorization = request.header("Authorization");
  const existing = authorization?.startsWith("Bearer ") ? verifyGuestSession(authorization.slice(7), botToken) : null;
  const currentUser = existing ?? { id: `guest:${randomUUID()}`, displayName: "Гость" };
  await progressRepository.getSnapshot(currentUser.id, currentUser.displayName);
  response.set("Cache-Control", "no-store").json({ accessToken: createGuestSession(currentUser.id, botToken), user: currentUser });
});

app.use("/api/v1", (request, response, next) => {
  if (!botToken) {
    response.locals.currentUser = user;
    next();
    return;
  }
  const currentUser = resolveApiUser(request.header("Authorization"), botToken);
  if (!currentUser) {
    response.status(401).json({ message: "Open this app from MAX to sign in" });
    return;
  }
  response.locals.currentUser = currentUser;
  response.set("Cache-Control", "no-store");
  next();
});

function requestUser(response: Response): AppUser {
  return response.locals.currentUser as AppUser;
}

app.get("/api/v1/home", async (_request, response) => response.json(await getHome(requestUser(response))));
app.get("/api/v1/courses", async (_request, response) => response.json(await getCourses(requestUser(response))));
app.get("/api/v1/courses/:courseId/lessons", async (request, response) => {
  const course = await getCourse(request.params.courseId, requestUser(response));
  if (!course) {
    response.status(404).json({ message: "Course not found" });
    return;
  }
  response.json(await getLessons(course.id, requestUser(response)));
});
app.get("/api/v1/lessons/:lessonId", async (request, response) => {
  const item = await getLesson(request.params.lessonId, requestUser(response));
  if (!item) {
    response.status(404).json({ message: "Lesson not found" });
    return;
  }
  response.json(item);
});
app.post("/api/v1/lessons/:lessonId/open", async (request, response) => {
  if (!await openLesson(request.params.lessonId, requestUser(response))) {
    response.status(404).json({ message: "Lesson not found" });
    return;
  }
  response.status(204).send();
});
app.get("/api/v1/lessons/:lessonId/quiz", (request, response) => {
  const quiz = getQuizByLesson(request.params.lessonId);
  if (!quiz) {
    response.status(404).json({ message: "Quiz not found" });
    return;
  }
  response.json(quiz);
});
app.post("/api/v1/quizzes/:quizId/submit", async (request, response) => {
  const answers = request.body?.answers;
  if (!Array.isArray(answers)) {
    response.status(400).json({ message: "Answers are required" });
    return;
  }
  const result = await submitQuiz(request.params.quizId, answers, requestUser(response));
  if (!result) {
    response.status(400).json({ message: "Answer every question before submitting" });
    return;
  }
  response.json(result);
});
app.get("/api/v1/market/assets", async (_request, response) => response.json(await getMarketAssets()));
app.get("/api/v1/market/assets/:symbol", async (request, response) => {
  const asset = await getMarketAssetDetail(request.params.symbol, String(request.query.period ?? "1W"));
  if (!asset) {
    response.status(404).json({ message: "Market asset not found" });
    return;
  }
  response.json(asset);
});
app.get("/api/v1/news", (_request, response) => response.json(listMarketNews()));
app.get("/api/v1/news/:newsId", (request, response) => {
  const article = getMarketNews(request.params.newsId);
  if (!article) {
    response.status(404).json({ message: "News article not found" });
    return;
  }
  response.json(article);
});
app.get("/api/v1/security/cases", async (_request, response) => response.json(await listSecurityCases(requestUser(response).id)));
app.get("/api/v1/security/cases/:caseId", async (request, response) => {
  const item = await getSecurityCase(request.params.caseId, requestUser(response).id);
  if (!item) {
    response.status(404).json({ message: "Security case not found" });
    return;
  }
  response.json(item);
});
app.post("/api/v1/security/cases/:caseId/submit", async (request, response) => {
  const optionId = request.body?.optionId;
  if (typeof optionId !== "string" || !optionId) {
    response.status(400).json({ message: "Option is required" });
    return;
  }
  const result = await submitSecurityCase(request.params.caseId, optionId, requestUser(response).id);
  if (!result) {
    response.status(400).json({ message: "Security case or option not found" });
    return;
  }
  response.json(result);
});
app.get("/api/v1/security/threats", (_request, response) => response.json(listThreats()));
app.get("/api/v1/security/threats/:threatId", (request, response) => {
  const item = getThreat(request.params.threatId);
  if (!item) {
    response.status(404).json({ message: "Threat not found" });
    return;
  }
  response.json(item);
});
app.get("/api/v1/security/progress", async (_request, response) => response.json(await getSecurityProgress(requestUser(response).id)));
app.get("/api/v1/profile", async (_request, response) => {
  response.json(await getFullProfile(requestUser(response)));
});
app.get("/api/v1/route", async (_request, response) => {
  const currentUser = requestUser(response);
  const [learning, security, simulations] = await Promise.all([
    progressRepository.getSnapshot(currentUser.id, currentUser.displayName),
    securityRepository.getCompletedCaseIds(currentUser.id),
    listCompletedSimulations(currentUser.id),
  ]);
  response.json(buildRecommendedRoute({
    completedLessonIds: learning.completedLessonIds,
    completedCaseIds: security,
    completedScenarioIds: simulations.map((item) => item.scenarioId),
  }));
});

app.get("/api/v1/onboarding", async (_request, response) => {
  response.json(await onboardingRepository.get(requestUser(response).id));
});
app.post("/api/v1/onboarding", async (request, response) => {
  const status = request.body?.status as OnboardingStatus | undefined;
  const step = request.body?.step;
  if (!(["IN_PROGRESS", "COMPLETED", "SKIPPED"] as OnboardingStatus[]).includes(status as OnboardingStatus)
      || !Number.isInteger(step) || step < 1 || step > 4) {
    response.status(400).json({ message: "Onboarding status or step is invalid" });
    return;
  }
  response.json(await onboardingRepository.save(requestUser(response).id, { status: status as "IN_PROGRESS" | "COMPLETED" | "SKIPPED", step }));
});

app.get("/api/v1/career", (_request, response) => response.json(getCareerOverview(requestUser(response).id)));
app.post("/api/v1/career/attempts", async (request, response) => {
  response.status(201).json(await createCareerAttempt(requestUser(response).id, request.body?.restart === true));
});
app.get("/api/v1/career/attempts/:attemptId", (request, response) => {
  const attempt = getCareerAttempt(request.params.attemptId, requestUser(response).id);
  attempt ? response.json(attempt) : response.status(404).json({ message: "Career attempt not found" });
});
app.post("/api/v1/career/attempts/:attemptId/answers", async (request, response) => {
  const { questionId, optionId } = request.body ?? {};
  if (typeof questionId !== "string" || typeof optionId !== "string") {
    response.status(400).json({ message: "Question and option are required" });
    return;
  }
  const attempt = await saveCareerAnswer(request.params.attemptId, requestUser(response).id, questionId, optionId);
  attempt ? response.json(attempt) : response.status(400).json({ message: "Career answer is invalid" });
});
app.post("/api/v1/career/attempts/:attemptId/complete", async (request, response) => {
  const result = await completeCareerAttempt(request.params.attemptId, requestUser(response).id);
  if ("data" in result) {
    response.json(result.data);
    return;
  }
  response.status(result.error === "NOT_FOUND" ? 404 : 400).json({ message: result.error === "NOT_FOUND" ? "Career attempt not found" : "Answer every question before completing" });
});
app.get("/api/v1/career/results/:attemptId", (request, response) => {
  const result = getCareerResult(request.params.attemptId, requestUser(response).id);
  result ? response.json(result) : response.status(404).json({ message: "Career result not found" });
});
app.get("/api/v1/career/roles/:roleId", (request, response) => {
  const role = getCareerRole(request.params.roleId);
  role ? response.json(role) : response.status(404).json({ message: "Career role not found" });
});

app.get("/api/v1/scenarios", (_request, response) => response.json(listScenarios()));
app.post("/api/v1/simulations", async (request, response) => {
  const state = await createSimulation(String(request.body?.scenarioId ?? ""), requestUser(response).id);
  if (!state) {
    response.status(404).json({ message: "Scenario not found" });
    return;
  }
  response.status(201).json(state);
});
app.get("/api/v1/simulations/:sessionId/state", async (request, response) => {
  const state = await getSimulationState(request.params.sessionId, requestUser(response).id);
  if (!state) {
    response.status(404).json({ message: "Simulation not found" });
    return;
  }
  response.json(state);
});
app.post("/api/v1/simulations/:sessionId/pause", async (request, response) => {
  const state = await pauseSimulation(request.params.sessionId, requestUser(response).id);
  state ? response.json(state) : response.status(404).json({ message: "Simulation not found" });
});
app.post("/api/v1/simulations/:sessionId/resume", async (request, response) => {
  const state = await resumeSimulation(request.params.sessionId, requestUser(response).id);
  state ? response.json(state) : response.status(404).json({ message: "Simulation not found" });
});
app.post("/api/v1/simulations/:sessionId/trades", async (request, response) => {
  const result = await makeTrade(request.params.sessionId, request.body ?? {}, request.header("Idempotency-Key"), requestUser(response).id);
  if ("error" in result) {
    response.status(result.status ?? 400).json({ message: result.error });
    return;
  }
  response.status(201).json(result.data);
});
app.post("/api/v1/simulations/:sessionId/complete", async (request, response) => {
  const result = await completeSimulation(request.params.sessionId, requestUser(response).id);
  if ("error" in result) {
    response.status(result.status ?? 400).json({ message: result.error });
    return;
  }
  response.json(result.data);
});

app.use(express.static(webDistPath, {
  setHeaders(response, filePath) {
    if (filePath === webIndexPath) response.setHeader("Cache-Control", "no-store");
    // Public artwork can be reused between screens and repeated visits.
    // Keep a short lifetime because these filenames are not content-hashed.
    else if (/\.(webp|png|jpe?g|svg)$/i.test(filePath)) response.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  },
}));
app.get(/^(?!\/api\/).*/, (_request, response) => {
  response.setHeader("Cache-Control", "no-store");
  response.sendFile(webIndexPath);
});

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

const progressRepository = await createProgressRepository();
await initializeLearningState(progressRepository);
const onboardingRepository = await createOnboardingRepository();
const simulationRepository = await createSimulationRepository();
configureSimulationRepository(simulationRepository);
const securityRepository = await createSecurityRepository();
configureSecurityRepository(securityRepository);
const careerRepository = await createCareerRepository();
await initializeCareerState(careerRepository);

app.listen(port, () => {
  console.log(`[api] listening on http://localhost:${port}`);
});
