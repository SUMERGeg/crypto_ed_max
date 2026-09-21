import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  Clock3,
  Compass,
  Info,
  Lightbulb,
  ListChecks,
  Route,
  ShieldAlert,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import type { CareerAttempt, CareerOverview, CareerResult, CareerRole } from "./types";

function useCareerData<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    loader(controller.signal).then(setData).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [loader]);
  return { data, error };
}

export function CareerLandingPage() {
  const loader = useCallback((signal: AbortSignal) => api.careerOverview(signal), []);
  const { data, error } = useCareerData(loader);
  const [starting, setStarting] = useState(false);
  const navigate = useNavigate();

  async function start(restart = false) {
    setStarting(true);
    try {
      const attempt = await api.createCareerAttempt(restart);
      navigate(`/career/test/${attempt.id}`);
    } finally {
      setStarting(false);
    }
  }

  if (error) return <CareerError />;
  if (!data) return <CareerLoading />;

  return (
    <div className="career-page career-landing">
      <CareerTopbar title="Карьерный компас" backTo="/" />
      <section className="career-hero">
        <div className="career-hero__copy">
          <span><Compass size={13}/> Найди направление</span>
          <h1>Где тебе может быть интересно в крипте?</h1>
          <p>{data.description}</p>
          <div className="career-hero__facts">
            <b><ListChecks/> {data.questionCount} вопросов</b>
            <b><Clock3/> {data.estimatedMinutes} минут</b>
            <b><BriefcaseBusiness/> {data.roleCount} направлений</b>
          </div>
        </div>
        <img src={robotAssets.thinking} alt="Крипто-помощник размышляет над карьерным маршрутом"/>
      </section>

      <div className="career-note"><Info/><p><strong>Это не приговор и не психологический диагноз.</strong> Компас предложит три направления и объяснит, какие ответы повлияли на результат.</p></div>

      {data.activeAttempt && (
        <section className="career-resume-card">
          <div><span>Незавершённое прохождение</span><strong>{data.activeAttempt.answeredCount} из {data.activeAttempt.totalQuestions} ответов сохранено</strong></div>
          <button onClick={() => void start(false)} disabled={starting}>Продолжить <ArrowRight/></button>
        </section>
      )}

      {data.latestResult && <LatestCareerResult result={data.latestResult}/>}

      <section className="career-section">
        <div className="career-section__heading"><span>Как это работает</span><h2>Пять коротких блоков</h2></div>
        <div className="career-block-list">
          {data.blocks.map((block) => (
            <article key={block.number}><i>{block.number}</i><div><strong>{block.title}</strong><small>{block.questionCount} вопросов</small></div></article>
          ))}
        </div>
      </section>

      <section className="career-section">
        <div className="career-section__heading"><span>Не только разработка</span><h2>Какие направления сравниваем</h2></div>
        <div className="career-role-preview">
          {data.roles.map((role) => (
            <NavLink to={`/career/roles/${role.id}`} key={role.id}>
              <i style={{ background: role.accent }}><BriefcaseBusiness/></i>
              <div><strong>{role.title}</strong><small>{role.shortDescription}</small></div>
              <ChevronRight/>
            </NavLink>
          ))}
        </div>
      </section>

      <section className="career-start-card">
        <Sparkles/>
        <div><strong>{data.activeAttempt ? "Можно продолжить с сохранённого места" : "Готовы попробовать?"}</strong><p>Правильных ответов нет. Выбирайте то, что действительно ближе вам.</p></div>
        <button onClick={() => void start(Boolean(data.latestResult) && !data.activeAttempt)} disabled={starting}>
          {starting ? "Создаём маршрут…" : data.activeAttempt ? "Продолжить тест" : data.latestResult ? "Пройти ещё раз" : "Начать тест"} <ArrowRight/>
        </button>
      </section>
    </div>
  );
}

function LatestCareerResult({ result }: { result: NonNullable<CareerOverview["latestResult"]> }) {
  return (
    <section className="career-latest">
      <div className="career-latest__heading"><span><Check/> Последний результат</span><small>{new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long" }).format(new Date(result.completedAt))}</small></div>
      <strong>{result.headline}</strong>
      <div>{result.topRoles.map((item) => <span key={item.role.id}>{item.role.title} · {item.fitPercent}%</span>)}</div>
      <NavLink to={`/career/result/${result.attemptId}`}>Открыть разбор <ArrowRight/></NavLink>
    </section>
  );
}

export function CareerTestPage() {
  const { attemptId = "" } = useParams();
  const loader = useCallback((signal: AbortSignal) => api.careerAttempt(attemptId, signal), [attemptId]);
  const { data, error } = useCareerData(loader);
  const [attempt, setAttempt] = useState<CareerAttempt | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!data) return;
    if (data.status === "COMPLETED") {
      navigate(`/career/result/${data.id}`, { replace: true });
      return;
    }
    setAttempt(data);
    const firstUnanswered = data.questions.findIndex((question) => !data.answers[question.id]);
    setCurrentIndex(firstUnanswered < 0 ? data.questions.length - 1 : firstUnanswered);
  }, [data, navigate]);

  const question = attempt?.questions[currentIndex];
  const selectedId = question ? attempt?.answers[question.id] : undefined;

  async function choose(optionId: string) {
    if (!attempt || !question || saving) return;
    setSaving(true);
    setSubmitError(false);
    try {
      setAttempt(await api.saveCareerAnswer(attempt.id, question.id, optionId));
    } catch {
      setSubmitError(true);
    } finally {
      setSaving(false);
    }
  }

  async function next() {
    if (!attempt || !question || !selectedId || saving) return;
    if (currentIndex < attempt.questions.length - 1) {
      setCurrentIndex((value) => value + 1);
      return;
    }
    setSaving(true);
    setSubmitError(false);
    try {
      await api.completeCareerAttempt(attempt.id);
      navigate(`/career/result/${attempt.id}`);
    } catch {
      setSubmitError(true);
      setSaving(false);
    }
  }

  if (error) return <CareerError />;
  if (!attempt || !question) return <CareerLoading />;

  const progress = Math.round(((currentIndex + 1) / attempt.totalQuestions) * 100);
  return (
    <div className="career-page career-test-page">
      <header className="career-test-topbar">
        <NavLink to="/career" aria-label="Сохранить и выйти"><ArrowLeft/></NavLink>
        <div><span>Блок {question.block} из 5</span><strong>{question.blockTitle}</strong></div>
        <b>{currentIndex + 1}/40</b>
      </header>
      <div className="career-test-progress"><i style={{ width: `${progress}%` }}/></div>
      <section className="career-question-card">
        <span>{question.type === "SINGLE_CHOICE" ? "Что вам ближе" : question.type === "SCALE_INTEREST" ? "Оцените интерес" : "Насколько это про вас"}</span>
        <h1>{question.text}</h1>
        <p>Здесь нет правильного ответа. Выберите вариант, который чаще соответствует вам.</p>
      </section>
      <div className={`career-options ${question.type === "SINGLE_CHOICE" ? "career-options--scenario" : ""}`}>
        {question.options.map((option, index) => (
          <button type="button" key={option.id} className={selectedId === option.id ? "selected" : ""} onClick={() => void choose(option.id)} disabled={saving}>
            <i>{question.type === "SINGLE_CHOICE" ? String.fromCharCode(65 + index) : index + 1}</i>
            <span>{option.text}</span>
            <b>{selectedId === option.id && <Check/>}</b>
          </button>
        ))}
      </div>
      {submitError && <p className="career-form-error">Не удалось сохранить ответ. Проверьте API и попробуйте ещё раз.</p>}
      <footer className="career-test-actions">
        <button type="button" className="career-back-step" onClick={() => setCurrentIndex((value) => Math.max(0, value - 1))} disabled={currentIndex === 0 || saving}><ArrowLeft/> Назад</button>
        <button type="button" className="career-next-step" onClick={() => void next()} disabled={!selectedId || saving}>{currentIndex === attempt.questions.length - 1 ? "Получить результат" : "Далее"} <ArrowRight/></button>
      </footer>
      <aside className="career-save-note"><Check/> Ответы сохраняются после каждого выбора.</aside>
    </div>
  );
}

export function CareerResultPage() {
  const { attemptId = "" } = useParams();
  const loader = useCallback((signal: AbortSignal) => api.careerResult(attemptId, signal), [attemptId]);
  const { data, error } = useCareerData(loader);
  if (error) return <CareerError />;
  if (!data) return <CareerLoading calculating />;
  return <CareerResultView result={data}/>;
}

function CareerResultView({ result }: { result: CareerResult }) {
  const main = result.topRoles[0];
  if (!main) return <CareerError />;
  const styleDimensions = result.dimensions.filter((item) => ["AN", "PR", "ST", "AD", "SC", "CO", "IN", "CR"].includes(item.id));
  return (
    <div className="career-page career-result-page">
      <CareerTopbar title="Ваш карьерный маршрут" backTo="/career" />
      <section className="career-result-hero">
        <img src={robotAssets.celebrating} alt="Крипто-помощник показывает результат"/>
        <span><Sparkles/> Результат готов</span>
        <h1>{result.headline}</h1>
        <p>{result.summary}</p>
      </section>
      <div className={`career-quality career-quality--${result.quality.level.toLowerCase()}`}><BrainCircuit/><div><strong>{result.quality.label}</strong><p>{result.quality.text}</p></div></div>

      <section className="career-section">
        <div className="career-section__heading"><span>Главное совпадение</span><h2>Направление, которое стоит проверить первым</h2></div>
        <article className="career-main-role" style={{ "--role-accent": main.role.accent } as CSSProperties}>
          <header><i><Compass/></i><div><span>Совпадение по ответам</span><h3>{main.role.title}</h3></div><b>{main.fitPercent}%</b></header>
          <p>{main.role.shortDescription}</p>
          <div className="career-why"><strong>Почему компас предлагает это направление</strong>{main.reasons.map((reason) => <p key={reason}><Check/>{reason}</p>)}</div>
          <div className="career-friction"><ShieldAlert/><p><strong>Что может потребовать усилий</strong>{main.challenge}</p></div>
          {main.role.disclaimer && <div className="career-investor-warning"><Info/>{main.role.disclaimer}</div>}
          <NavLink to={`/career/roles/${main.role.id}`}>Посмотреть профессию <ArrowRight/></NavLink>
        </article>
      </section>

      <section className="career-section">
        <div className="career-section__heading"><span>Альтернативные траектории</span><h2>Ещё два близких направления</h2></div>
        <div className="career-alternatives">
          {result.topRoles.slice(1).map((item) => (
            <NavLink to={`/career/roles/${item.role.id}`} key={item.role.id} style={{ "--role-accent": item.role.accent } as CSSProperties}>
              <i><BriefcaseBusiness/></i><div><strong>{item.role.title}</strong><p>{item.reasons[0]}</p><small>{item.challenge}</small>{item.role.disclaimer && <em>{item.role.disclaimer}</em>}</div><b>{item.fitPercent}%</b>
            </NavLink>
          ))}
        </div>
      </section>

      <section className="career-section">
        <div className="career-section__heading"><span>Не оценка личности</span><h2>Ваши рабочие предпочтения</h2></div>
        <div className="career-dimensions">
          {styleDimensions.map((dimension) => (
            <article key={dimension.id}><div><strong>{dimension.label}</strong><b>{dimension.value}%</b></div><span><i style={{ width: `${dimension.value}%` }}/></span><p>{dimension.description}</p></article>
          ))}
        </div>
      </section>

      <section className="career-next-action">
        <Target/>
        <div><span>Первый шаг · 15–30 минут</span><strong>{main.role.practiceTask}</strong></div>
        <NavLink to={main.role.id === "crypto-investor" ? "/practice" : `/career/roles/${main.role.id}`}>{main.role.id === "crypto-investor" ? "Открыть Market Replay" : "Подготовиться"} <ArrowRight/></NavLink>
      </section>

      <p className="career-result-disclaimer"><Info/>{result.disclaimer}</p>
      <NavLink className="career-result-home" to="/profile">Сохранено в профиле <ChevronRight/></NavLink>
    </div>
  );
}

export function CareerRolePage() {
  const { roleId = "" } = useParams();
  const loader = useCallback((signal: AbortSignal) => api.careerRole(roleId, signal), [roleId]);
  const { data, error } = useCareerData(loader);
  if (error) return <CareerError />;
  if (!data) return <CareerLoading />;
  return <CareerRoleView role={data}/>;
}

function CareerRoleView({ role }: { role: CareerRole }) {
  return (
    <div className="career-page career-role-page">
      <CareerTopbar title="Профессия" backTo="/career" />
      <section className="career-role-hero" style={{ "--role-accent": role.accent } as CSSProperties}>
        <i><BriefcaseBusiness/></i><span>Направление в криптоиндустрии</span><h1>{role.title}</h1><p>{role.shortDescription}</p>
      </section>
      {role.disclaimer && <div className="career-investor-warning"><ShieldAlert/>{role.disclaimer}</div>}
      <RoleSection icon={<ListChecks/>} title="Что делают каждый день" items={role.dailyTasks}/>
      <RoleSection icon={<BrainCircuit/>} title="Что пригодится для старта" items={role.entrySkills}/>
      <RoleSection icon={<BookOpen/>} title="Что изучить в приложении" items={role.learningPath}/>
      <section className="career-role-challenge"><ShieldAlert/><div><span>Без романтизации</span><strong>Что может быть сложным</strong><p>{role.challenge}</p></div></section>
      <section className="career-role-practice"><Lightbulb/><div><span>Попробуйте профессию безопасно</span><strong>{role.practiceTask}</strong></div></section>
      <NavLink className="career-role-cta" to="/career">Перейти к компасу <Compass/></NavLink>
    </div>
  );
}

function RoleSection({ icon, title, items }: { icon: ReactNode; title: string; items: string[] }) {
  return <section className="career-role-section"><header>{icon}<h2>{title}</h2></header>{items.map((item) => <p key={item}><Check/>{item}</p>)}</section>;
}

function CareerTopbar({ title, backTo }: { title: string; backTo: string }) {
  return <header className="career-topbar"><NavLink to={backTo} aria-label="Назад"><ArrowLeft/></NavLink><strong>{title}</strong><span><Compass/></span></header>;
}

function CareerLoading({ calculating = false }: { calculating?: boolean }) {
  return <div className="career-page career-skeleton" role="status" aria-label={calculating ? "Сравниваем ответы" : "Загружаем Карьерный компас"}>
    <div className="career-skeleton__topbar"><i/><b/><i/></div>
    <section className="career-skeleton__hero"><span><b/><b/><b/></span><i/></section>
    <section className="career-skeleton__card"><i/><span><b/><b/><b/></span></section>
    <section className="career-skeleton__card"><i/><span><b/><b/></span></section>
  </div>;
}

function CareerError() {
  return <div className="career-page career-load-state"><Route/><strong>Не удалось открыть Карьерный компас</strong><p>Проверьте, запущен ли локальный API, и обновите страницу.</p><NavLink to="/">На главную</NavLink></div>;
}
