import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  GraduationCap,
  Layers3,
  LineChart,
  Lock,
  Medal,
  Moon,
  Palette,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Star,
  Sun,
  Target,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import { useTheme, type Theme } from "./theme";
import type { CareerOverview, Course, ProfileData } from "./types";

const profileDate = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" });

function useProfile() {
  const loader = useCallback((signal: AbortSignal) => api.profile(signal), []);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    loader(controller.signal).then(setData).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [loader, version]);

  return { data, error, retry: () => setVersion((current) => current + 1) };
}

export function ProfilePage() {
  const { data, error, retry } = useProfile();
  const { theme, setTheme } = useTheme();

  if (error) return <ProfileError retry={retry}/>;
  if (!data) return <ProfileSkeleton/>;

  return (
    <div className="full-profile-page">
      <header className="profile-topbar"><NavLink to="/" aria-label="На главную"><ArrowLeft size={19}/></NavLink><strong>Мой профиль</strong><span><Sparkles size={17}/></span></header>
      <ProfileHero data={data}/>
      <ProfileStats data={data}/>
      <AppearanceSettings theme={theme} setTheme={setTheme}/>
      <CareerCompassSummary/>
      <ContinueLearning data={data}/>
      <CourseProgress courses={data.courses}/>
      <QuizHistory data={data}/>
      <SecuritySummary data={data}/>
      <ReplayHistory data={data}/>
      <Achievements data={data}/>
      <aside className="profile-helper"><img src={robotAssets.reading} alt="Крипто-помощник читает прогресс"/><div><strong>Не гонись за процентом</strong><p>{data.robotMessage}</p></div></aside>
      <p className="profile-note">В профиле хранится только учебная активность. Реальных счетов, кошельков и финансовых данных здесь нет.</p>
    </div>
  );
}

function CareerCompassSummary() {
  const [career, setCareer] = useState<CareerOverview | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.careerOverview(controller.signal).then(setCareer).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const result = career?.latestResult;
  return (
    <section className="profile-section profile-career-section">
      <ProfileHeading eyebrow="Персональный маршрут" title="Карьерный компас" action={result ? "Готов" : undefined}/>
      <NavLink className="profile-career-card" to={result ? `/career/result/${result.attemptId}` : "/career"}>
        <span className="profile-career-card__icon"><Compass/></span>
        <div>
          {result ? (
            <><small>Главное совпадение</small><strong>{result.topRoles[0]?.role.title ?? "Результат готов"}</strong><p>{result.headline}</p></>
          ) : career?.activeAttempt ? (
            <><small>Прохождение сохранено</small><strong>{career.activeAttempt.answeredCount} из {career.activeAttempt.totalQuestions} ответов</strong><p>Продолжи с того места, где остановился.</p></>
          ) : (
            <><small>40 вопросов · около 10 минут</small><strong>Найди подходящие роли в крипте</strong><p>Получишь три направления и объяснение выбора.</p></>
          )}
        </div>
        <ChevronRight/>
      </NavLink>
    </section>
  );
}

function AppearanceSettings({ theme, setTheme }: { theme: Theme; setTheme: (theme: Theme) => void }) {
  return (
    <section className="profile-section profile-appearance">
      <ProfileHeading eyebrow="Для всего приложения" title="Оформление"/>
      <div className="theme-settings-card">
        <div className="theme-settings-card__heading"><Palette/><div><strong>Тема интерфейса</strong><small>Одинаковая на всех экранах</small></div></div>
        <div className="theme-switch" role="group" aria-label="Тема интерфейса">
          <button type="button" className={theme === "light" ? "active" : ""} aria-pressed={theme === "light"} onClick={() => setTheme("light")}><Sun/> Светлая</button>
          <button type="button" className={theme === "dark" ? "active" : ""} aria-pressed={theme === "dark"} onClick={() => setTheme("dark")}><Moon/> Тёмная</button>
        </div>
      </div>
    </section>
  );
}

function ProfileHero({ data }: { data: ProfileData }) {
  const angle = data.overallProgress.percent * 3.6;
  return (
    <section className="full-profile-hero">
      <img src={robotAssets.celebrating} alt="Крипто-помощник празднует прогресс"/>
      <div className="full-profile-hero__copy"><span>Твой учебный путь</span><h1>{data.user.displayName}</h1><p>{data.level}</p></div>
      <div className="profile-ring" style={{ background: `conic-gradient(#63d8ab ${angle}deg, rgba(255,255,255,.12) ${angle}deg)` }}><i><strong>{data.overallProgress.percent}%</strong><small>уроки</small></i></div>
    </section>
  );
}

function ProfileStats({ data }: { data: ProfileData }) {
  return (
    <section className="profile-stat-grid">
      <ProfileStat icon={<BookOpen/>} value={`${data.overallProgress.completedLessons}/${data.overallProgress.totalLessons}`} label="уроков" tone="blue"/>
      <ProfileStat icon={<Star/>} value={data.quizStats.attemptCount ? `${data.quizStats.bestScore}%` : "—"} label="лучший тест" tone="amber"/>
      <ProfileStat icon={<ShieldCheck/>} value={`${data.security.completedCases}/${data.security.totalCases}`} label="кейсов" tone="green"/>
      <ProfileStat icon={<LineChart/>} value={String(data.simulations.completedCount)} label="Replay" tone="violet"/>
    </section>
  );
}

function ProfileStat({ icon, value, label, tone }: { icon: ReactNode; value: string; label: string; tone: string }) {
  return <div className={`profile-stat profile-stat--${tone}`}><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function ContinueLearning({ data }: { data: ProfileData }) {
  return (
    <section className="profile-section">
      <ProfileHeading eyebrow="Быстро вернуться" title="Продолжить обучение"/>
      <NavLink className="profile-continue" to={`/lessons/${data.lastLesson.id}`}>
        <span><GraduationCap/></span>
        <div><small>{data.lastLesson.courseTitle}</small><strong>{data.lastLesson.title}</strong><Progress value={data.lastLesson.progressPercent}/></div>
        <ChevronRight size={17}/>
      </NavLink>
    </section>
  );
}

function CourseProgress({ courses }: { courses: Course[] }) {
  return (
    <section className="profile-section">
      <ProfileHeading eyebrow="20 уроков · 4 направления" title="Прогресс по темам"/>
      <div className="profile-course-list">
        {courses.map((course, index) => (
          <NavLink to={`/learn/${course.id}`} key={course.id}>
            <span className={`profile-course-icon profile-course-icon--${course.accent}`}>{courseIcon(index)}</span>
            <div><strong>{course.title}</strong><small>{course.progress.completedLessons} из {course.progress.totalLessons} уроков</small><Progress value={course.progress.percent}/></div>
            <b>{course.progress.percent}%</b>
          </NavLink>
        ))}
      </div>
    </section>
  );
}

function QuizHistory({ data }: { data: ProfileData }) {
  return (
    <section className="profile-section">
      <ProfileHeading eyebrow={`${data.quizStats.attemptCount} ${attemptWord(data.quizStats.attemptCount)}`} title="Результаты тестов" action={data.quizStats.attemptCount ? `${data.quizStats.bestScore}%` : undefined}/>
      {data.quizStats.results.length === 0 ? (
        <ProfileEmpty icon={<Star/>} title="Пока нет итоговых тестов" text="Заверши любой урок и пройди тест — результат появится здесь." to="/learn" action="Выбрать урок"/>
      ) : (
        <div className="profile-quiz-list">
          {data.quizStats.results.slice(0, 4).map((result) => (
            <NavLink to={`/lessons/${result.lessonId}/quiz`} key={result.lessonId}>
              <span className={result.bestScore >= 67 ? "passed" : ""}>{result.bestScore}%</span>
              <div><strong>{result.lessonTitle}</strong><small>{result.courseTitle} · попыток: {result.attemptCount}</small></div>
              <ChevronRight size={15}/>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}

function SecuritySummary({ data }: { data: ProfileData }) {
  return (
    <section className="profile-section">
      <ProfileHeading eyebrow={`${data.security.threatCount} карточек в справочнике`} title="Безопасность"/>
      <NavLink className="profile-security-card" to="/security">
        <div className="profile-security-icon"><ShieldCheck/></div>
        <div><strong>{data.security.completedCases} из {data.security.totalCases} кейсов</strong><p>{data.security.completedCases === data.security.totalCases ? "Все ситуации разобраны — их всегда можно повторить." : "Следующий кейс поможет потренироваться без риска."}</p><Progress value={data.security.percent}/></div>
        <ChevronRight size={17}/>
      </NavLink>
    </section>
  );
}

function ReplayHistory({ data }: { data: ProfileData }) {
  return (
    <section className="profile-section">
      <ProfileHeading eyebrow={`${data.simulations.totalTrades} виртуальных операций`} title="Завершённые Market Replay" action={String(data.simulations.completedCount)}/>
      {data.simulations.items.length === 0 ? (
        <ProfileEmpty icon={<BarChart3/>} title="Нет завершённых сценариев" text="Результат появится после того, как исторический период дойдёт до конца." to="/practice" action="Выбрать сценарий"/>
      ) : (
        <div className="profile-replay-list">
          {data.simulations.items.slice(0, 4).map((item) => (
            <NavLink to={`/simulation/${item.sessionId}/result`} key={item.sessionId}>
              <span className={item.returnPercent >= 0 ? "positive" : "negative"}><TrendingUp/></span>
              <div><strong>{item.scenarioTitle}</strong><small>{item.tradeCount} операций{item.completedAt ? ` · ${profileDate.format(new Date(item.completedAt))}` : ""}</small></div>
              <b className={item.returnPercent >= 0 ? "positive" : "negative"}>{item.returnPercent >= 0 ? "+" : ""}{item.returnPercent.toFixed(2)}%</b>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}

function Achievements({ data }: { data: ProfileData }) {
  return (
    <section className="profile-section profile-achievements">
      <ProfileHeading eyebrow="Лёгкая мотивация, не доступ к функциям" title="Достижения" action={`${data.achievements.unlocked}/${data.achievements.total}`}/>
      <div className="achievement-grid">
        {data.achievements.items.map((item) => {
          const percent = Math.round(item.progress / Math.max(1, item.target) * 100);
          return (
            <article className={item.unlocked ? "unlocked" : "locked"} key={item.id}>
              <span>{item.unlocked ? achievementIcon(item.icon) : <Lock/>}</span>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              {item.unlocked ? <small><Check size={11}/> Получено</small> : <div className="achievement-progress"><i style={{ width: `${percent}%` }}/><small>{item.progress}/{item.target}</small></div>}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ProfileHeading({ eyebrow, title, action }: { eyebrow: string; title: string; action?: string }) {
  return <div className="profile-heading"><div><span>{eyebrow}</span><h2>{title}</h2></div>{action && <b>{action}</b>}</div>;
}

function Progress({ value }: { value: number }) {
  return <div className="profile-progress"><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }}/></div>;
}

function ProfileEmpty({ icon, title, text, to, action }: { icon: ReactNode; title: string; text: string; to: string; action: string }) {
  return <div className="profile-empty"><span>{icon}</span><div><strong>{title}</strong><p>{text}</p><NavLink to={to}>{action} <ChevronRight size={12}/></NavLink></div></div>;
}

function ProfileError({ retry }: { retry: () => void }) {
  return <div className="full-profile-page profile-load-state"><RefreshCw size={24}/><strong>Не удалось собрать профиль</strong><p>Учебные данные не потеряны. Попробуй загрузить экран ещё раз.</p><button onClick={retry}><RefreshCw size={14}/> Повторить</button></div>;
}

function ProfileSkeleton() {
  return <div className="full-profile-page profile-skeleton"><i/><i/><i/><i/><i/></div>;
}

function courseIcon(index: number) {
  return [<Sparkles/>, <Layers3/>, <TrendingUp/>, <BookOpen/>][index] ?? <BookOpen/>;
}

function achievementIcon(icon: ProfileData["achievements"]["items"][number]["icon"]) {
  if (icon === "BOOK") return <BookOpen/>;
  if (icon === "STAR") return <Star/>;
  if (icon === "SHIELD") return <ShieldCheck/>;
  if (icon === "CHART") return <LineChart/>;
  if (icon === "LAYERS") return <Layers3/>;
  if (icon === "TARGET") return <Target/>;
  return <Medal/>;
}

function attemptWord(count: number) {
  if (count % 10 === 1 && count % 100 !== 11) return "попытка";
  if ([2, 3, 4].includes(count % 10) && ![12, 13, 14].includes(count % 100)) return "попытки";
  return "попыток";
}
