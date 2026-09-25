import {
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleUserRound,
  Compass,
  GraduationCap,
  Home,
  Landmark,
  LineChart,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import { NavLink, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import type { Course, HomeData } from "./types";
import { currentMaxLaunchData } from "./max-client";
import { RouteNextStep } from "./RouteNextStep";
import { backDestination } from "./navigation";
import { useTheme } from "./theme";

function lazyPage<T extends Record<K, ComponentType>, K extends keyof T>(loader: () => Promise<T>, name: K) {
  return lazy(async () => ({ default: (await loader())[name] }));
}

const CourseLessonsPage = lazyPage(() => import("./LearningPages"), "CourseLessonsPage");
const LessonPage = lazyPage(() => import("./LearningPages"), "LessonPage");
const QuizPage = lazyPage(() => import("./LearningPages"), "QuizPage");
const QuizResultPage = lazyPage(() => import("./LearningPages"), "QuizResultPage");
const PracticePage = lazyPage(() => import("./SimulationPages"), "PracticePage");
const ScenarioIntroPage = lazyPage(() => import("./SimulationPages"), "ScenarioIntroPage");
const ReplayPage = lazyPage(() => import("./SimulationPages"), "ReplayPage");
const ReplayResultPage = lazyPage(() => import("./SimulationPages"), "ReplayResultPage");
const SecurityPage = lazyPage(() => import("./SecurityPages"), "SecurityPage");
const SecurityCasePage = lazyPage(() => import("./SecurityPages"), "SecurityCasePage");
const ThreatPage = lazyPage(() => import("./SecurityPages"), "ThreatPage");
const MarketPage = lazyPage(() => import("./MarketPages"), "MarketPage");
const MarketNewsPage = lazyPage(() => import("./MarketPages"), "MarketNewsPage");
const MarketAssetPage = lazyPage(() => import("./MarketPages"), "MarketAssetPage");
const ProfilePage = lazyPage(() => import("./ProfilePage"), "ProfilePage");
const RecommendedRoutePage = lazyPage(() => import("./RecommendedRoutePage"), "RecommendedRoutePage");
const CareerLandingPage = lazyPage(() => import("./CareerPages"), "CareerLandingPage");
const CareerTestPage = lazyPage(() => import("./CareerPages"), "CareerTestPage");
const CareerResultPage = lazyPage(() => import("./CareerPages"), "CareerResultPage");
const CareerRolePage = lazyPage(() => import("./CareerPages"), "CareerRolePage");

const sectionLoaders = {
  learn: () => import("./LearningPages"),
  practice: () => import("./SimulationPages"),
  security: () => import("./SecurityPages"),
  market: () => import("./MarketPages"),
  profile: () => import("./ProfilePage"),
  career: () => import("./CareerPages"),
};

function preloadSection(path: string) {
  const section = path.split("/")[1] as keyof typeof sectionLoaders;
  return sectionLoaders[section]?.();
}

function detailParentPath(pathname: string) {
  if (pathname.startsWith("/lessons") || pathname.startsWith("/quiz")) return "/learn";
  if (pathname.startsWith("/simulation") || pathname.startsWith("/practice/")) return "/practice";
  if (pathname.startsWith("/security/")) return "/security";
  if (pathname.startsWith("/market/")) return "/market";
  if (pathname.startsWith("/career/")) return "/career";
  if (pathname === "/route") return "/profile";
  return "/";
}

function useRemoteData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loader(controller.signal).then(setData).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [loader]);

  return { data, error };
}

export function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const showBottomNav = ["/", "/learn", "/practice", "/security", "/market", "/profile"].includes(location.pathname);

  useEffect(() => {
    if (!currentMaxLaunchData()) return;
    const button = window.WebApp?.BackButton;
    if (!button) return;
    if (location.pathname === "/") {
      button.hide();
      return;
    }
    const goBack = () => navigate(backDestination({ fromRoute: new URLSearchParams(location.search).get("from") === "route", parent: detailParentPath(location.pathname) }));
    button.show();
    button.onClick(goBack);
    return () => button.offClick(goBack);
  }, [location.pathname, navigate]);

  return (
    <main className="app-canvas" data-crypto-theme={theme}>
      <section className="phone-shell">
            <div className="screen-scroll">
              <Suspense fallback={<RouteChunkFallback pathname={location.pathname} />}>
              <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/learn" element={<LearnPage />} />
            <Route path="/learn/:courseId" element={<CourseLessonsPage />} />
            <Route path="/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/lessons/:lessonId/quiz" element={<QuizPage />} />
            <Route path="/quiz/result" element={<QuizResultPage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/practice/:scenarioId" element={<ScenarioIntroPage />} />
            <Route path="/simulation/:sessionId" element={<ReplayPage />} />
            <Route path="/simulation/:sessionId/result" element={<ReplayResultPage />} />
            <Route path="/security" element={<SecurityPage />} />
            <Route path="/security/cases/:caseId" element={<SecurityCasePage />} />
            <Route path="/security/threats/:threatId" element={<ThreatPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/market/news/:newsId" element={<MarketNewsPage />} />
            <Route path="/market/:symbol" element={<MarketAssetPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/route" element={<RecommendedRoutePage />} />
            <Route path="/career" element={<CareerLandingPage />} />
            <Route path="/career/test/:attemptId" element={<CareerTestPage />} />
            <Route path="/career/result/:attemptId" element={<CareerResultPage />} />
            <Route path="/career/roles/:roleId" element={<CareerRolePage />} />
              </Routes>
              </Suspense>
        </div>
        {showBottomNav && <BottomNav />}
      </section>
    </main>
  );
}

function BottomNav() {
  const nav = [
    { to: "/", label: "Главная", icon: Home },
    { to: "/learn", label: "Учиться", icon: BookOpen },
    { to: "/practice", label: "Практика", icon: Target },
    { to: "/security", label: "Безопасность", icon: ShieldCheck },
    { to: "/market", label: "Рынок", icon: LineChart },
  ];

  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {nav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === "/"} className="bottom-nav__item" onPointerEnter={() => void preloadSection(item.to)} onFocus={() => void preloadSection(item.to)} onTouchStart={() => void preloadSection(item.to)}>
          <item.icon size={19} strokeWidth={1.9} />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function RouteChunkFallback({ pathname }: { pathname: string }) {
  const label = pathname.startsWith("/practice") || pathname.startsWith("/simulation") ? "практику" : pathname.startsWith("/security") ? "безопасность" : pathname.startsWith("/market") ? "рынок" : pathname.startsWith("/career") ? "карьерный компас" : pathname.startsWith("/profile") ? "профиль" : "урок";
  return <div className="route-chunk-skeleton" role="status" aria-label={`Загружаем ${label}`}>
    <header><i/><span><b/><b/></span></header>
    <section className="route-chunk-skeleton__hero"><b/><b/><b/></section>
    <section className="route-chunk-skeleton__cards"><i/><i/><i/></section>
  </div>;
}

function HomePage() {
  const loader = useMemo(() => api.home, []);
  const { data, error } = useRemoteData(loader);

  if (error) return <ErrorState />;
  if (!data) return <HomeSkeleton />;

  return (
    <div className="page page--home">
      <header className="home-header">
        <div>
          <span className="eyebrow eyebrow--dark">Твой учебный маршрут</span>
          <h1>Привет, {data.user.displayName}! <span aria-hidden="true">👋</span></h1>
        </div>
        <NavLink className="icon-button icon-button--dark" to="/profile" aria-label="Открыть профиль">
          <CircleUserRound size={19} />
        </NavLink>
      </header>

      <RouteNextStep dashboardLesson={data.continueLesson} />

      <section className="home-section">
        <div className="section-heading">
          <h2>Разделы</h2>
          <span>Выбери следующий шаг</span>
        </div>
        <div className="quick-grid">
          <QuickLink to="/learn" icon={<GraduationCap />} title="Учиться" subtitle="Короткие уроки" tone="blue" />
          <QuickLink to="/practice" icon={<TrendingUp />} title="Практика" subtitle="Market Replay" tone="green" />
          <QuickLink to="/security" icon={<ShieldCheck />} title="Безопасность" subtitle="Кейсы и риски" tone="coral" />
          <QuickLink to="/market" icon={<Landmark />} title="Крипторынок" subtitle="Цены и новости" tone="violet" />
        </div>
      </section>

      <NavLink className="career-home-card" to="/career">
        <div className="career-home-card__icon"><Compass/></div>
        <div><span>Новая возможность</span><strong>Карьерный компас</strong><p>40 вопросов помогут найти подходящие роли в криптоиндустрии.</p><small>8–12 минут · 10 направлений</small></div>
        <img src={robotAssets.thinking} alt="" aria-hidden="true"/>
        <ChevronRight className="career-home-card__arrow"/>
      </NavLink>

      <section className="progress-card">
        <div className="progress-card__top">
          <div>
            <span className="section-kicker">Твой прогресс</span>
            <strong><Sparkles size={18} /> {data.overallProgress.percent}%</strong>
          </div>
          <span className="progress-card__lessons">{data.overallProgress.completedLessons} из {data.overallProgress.totalLessons} уроков</span>
        </div>
        <Progress value={data.overallProgress.percent} dark />
      </section>

      <NavLink className="news-card" to="/market">
        <div className="news-card__icon"><BarChart3 size={19} /></div>
        <div>
          <span className="section-kicker">Последний разбор</span>
          <h3>{data.latestNews.title}</h3>
          <p>{data.latestNews.preview}</p>
        </div>
        <ChevronRight size={20} />
      </NavLink>

      <aside className="robot-tip robot-tip--dark">
        <img src={robotAssets.teaching} alt="" aria-hidden="true" />
        <div>
          <span>Совет помощника</span>
          <p>{data.robotTip}</p>
        </div>
      </aside>
    </div>
  );
}

function QuickLink({ to, icon, title, subtitle, tone }: { to: string; icon: ReactNode; title: string; subtitle: string; tone: string }) {
  return (
    <NavLink to={to} className={`quick-link quick-link--${tone}`}>
      <span className="quick-link__icon">{icon}</span>
      <span><strong>{title}</strong><small>{subtitle}</small></span>
      <ChevronRight size={17} />
    </NavLink>
  );
}

function LearnPage() {
  const loader = useMemo(() => api.courses, []);
  const { data, error } = useRemoteData(loader);

  return (
    <div className="page page--light">
      <PageHeader eyebrow="Учись в своём темпе" title="Учиться" description="Выбери тему: все направления открыты сразу." />
      <div className="assistant-corner"><img src={robotAssets.reading} alt="Крипто-помощник читает" /></div>
      <RouteNextStep />
      {error ? <ErrorState compact /> : !data ? <ListSkeleton /> : (
        <div className="course-list">
          {data.map((course, index) => <CourseCard key={course.id} course={course} index={index} />)}
        </div>
      )}
      <aside className="robot-tip">
        <div className="tip-icon"><Sparkles size={16} /></div>
        <div><span>Совет помощника</span><p>Начни с «Криптовалют»: базовые понятия пригодятся дальше.</p></div>
      </aside>
    </div>
  );
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  const icons = [WalletCards, Landmark, BarChart3, ShieldCheck];
  const Icon = icons[index] ?? BookOpen;
  return (
    <NavLink className="course-card" to={`/learn/${course.id}`}>
      <div className={`course-card__icon course-card__icon--${course.accent}`}><Icon size={22} /></div>
      <div className="course-card__body">
        <h3>{course.title}</h3>
        <p>{course.lessonCount} {lessonWord(course.lessonCount)} · {course.shortDescription}</p>
        <Progress value={course.progress.percent} />
      </div>
      <div className="course-card__meta"><strong>{course.progress.percent}%</strong><ChevronRight size={18} /></div>
    </NavLink>
  );
}

function lessonWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "уроков";
  if (last === 1) return "урок";
  if (last >= 2 && last <= 4) return "урока";
  return "уроков";
}

function SimplePage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="page page--light"><PageHeader eyebrow={eyebrow} title={title} description={description} />{children}</div>;
}

function PageHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="page-header"><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>;
}

function Progress({ value, dark = false }: { value: number; dark?: boolean }) {
  return <div className={`progress-track ${dark ? "progress-track--dark" : ""}`}><span style={{ width: `${value}%` }} /></div>;
}

function InfoCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return <div className="info-card"><div>{icon}</div><span><strong>{title}</strong><p>{text}</p></span></div>;
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="stat"><strong>{value}</strong><span>{label}</span></div>;
}

function ErrorState({ compact = false }: { compact?: boolean }) {
  return <div className={`error-state ${compact ? "error-state--compact" : ""}`}><strong>Не удалось загрузить данные</strong><span>Проверь, запущен ли локальный API.</span></div>;
}

function HomeSkeleton() {
  return <div className="page page--home" role="status" aria-label="Загружаем главную страницу">
    <div className="skeleton skeleton--title" />
    <section className="skeleton skeleton--hero">
      <span className="skeleton__eyebrow" /><span className="skeleton__line skeleton__line--wide" /><span className="skeleton__line" /><span className="skeleton__progress" />
    </section>
    <div className="skeleton-grid">{Array.from({ length: 4 }, (_, index) => <article className="skeleton-card" key={index}><i className="skeleton-card__icon" /><span><b className="skeleton__line skeleton__line--wide" /><b className="skeleton__line" /></span></article>)}</div>
  </div>;
}

function ListSkeleton() {
  return <div className="course-list" role="status" aria-label="Загружаем направления обучения">{Array.from({ length: 4 }, (_, index) => <article className="skeleton skeleton--row" key={index}><i className="skeleton-card__icon" /><span className="skeleton--row-lines"><b className="skeleton__line skeleton__line--wide" /><b className="skeleton__line" /><b className="skeleton__progress" /></span></article>)}</div>;
}
