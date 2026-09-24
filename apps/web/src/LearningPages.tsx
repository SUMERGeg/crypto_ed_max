import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import { backDestination, contextualFollowUp } from "./navigation";
import { LessonIllustration, preloadImage } from "./lesson-images";
import type { CourseLessons, Lesson, Quiz, QuizAnswer, QuizResult } from "./types";

function isAbortError(reason: unknown) {
  return reason instanceof DOMException && reason.name === "AbortError";
}

function InlineLessonMarkdown({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  ))}</>;
}

function LessonMarkdown({ body }: { body: string }) {
  const lines = body.split("\n");
  const content: ReactNode[] = [];
  let index = 0;

  const isListLine = (line: string) => /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
  while (index < lines.length) {
    if (!lines[index]?.trim()) { index += 1; continue; }
    if (lines[index]!.startsWith("```")) {
      index += 1;
      const code: string[] = [];
      while (index < lines.length && !lines[index]!.startsWith("```")) code.push(lines[index++]!);
      index += 1;
      content.push(<pre key={content.length}>{code.join("\n")}</pre>);
      continue;
    }
    if (lines[index]!.startsWith("> ")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index]!.startsWith("> ")) quote.push(lines[index++]!.slice(2));
      content.push(<blockquote key={content.length}><InlineLessonMarkdown text={quote.join("\n")} /></blockquote>);
      continue;
    }
    if (isListLine(lines[index]!)) {
      const ordered = /^\d+\.\s+/.test(lines[index]!);
      const items: string[] = [];
      while (index < lines.length) {
        const line = lines[index]!;
        if (!line.trim()) { index += 1; continue; }
        const match = line.match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!match) break;
        items.push(match[1]!);
        index += 1;
      }
      const Tag = ordered ? "ol" : "ul";
      content.push(<Tag key={content.length}>{items.map((item, itemIndex) => <li key={itemIndex}><InlineLessonMarkdown text={item} /></li>)}</Tag>);
      continue;
    }
    const paragraph: string[] = [];
    while (index < lines.length && lines[index]!.trim() && !lines[index]!.startsWith("```") && !lines[index]!.startsWith("> ") && !isListLine(lines[index]!)) paragraph.push(lines[index++]!);
    content.push(<p key={content.length}><InlineLessonMarkdown text={paragraph.join("\n")} /></p>);
  }
  return <div className="lesson-page-card__body">{content}</div>;
}

function FlowTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="flow-topbar">
      <button type="button" className="flow-back" onClick={onBack} aria-label="Назад"><ArrowLeft size={20} /></button>
      <span>{title}</span>
      <span className="flow-topbar__spacer" />
    </header>
  );
}

export function CourseLessonsPage() {
  const { courseId = "" } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<CourseLessons | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.courseLessons(courseId, controller.signal).then(setData).catch((reason: unknown) => {
      if (!isAbortError(reason)) setError(true);
    });
    void preloadImage(robotAssets.reading, "high");
    return () => controller.abort();
  }, [courseId]);

  return (
    <div className="page page--light page--flow">
      <FlowTopBar title="Направление" onBack={() => navigate("/learn")} />
      {error ? <FlowError /> : !data ? <FlowLoading /> : (
        <>
          <section className="course-hero">
            <div className="course-hero__copy">
              <span>Направление</span>
              <h1>{data.course.title}</h1>
              <p>{data.course.shortDescription}</p>
              <div className="course-hero__progress"><i style={{ width: `${data.course.progress.percent}%` }} /></div>
              <small>{data.course.progress.completedLessons} из {data.course.progress.totalLessons} уроков завершено</small>
            </div>
            <img src={robotAssets.reading} alt="Робот читает учебник" />
          </section>

          <div className="lesson-list-heading"><h2>Уроки</h2><span>Все доступны сразу</span></div>
          <div className="lesson-list">
            {data.lessons.map((lesson) => (
              <Link className="lesson-row" to={`/lessons/${lesson.id}`} key={lesson.id}>
                <span className={`lesson-row__status lesson-row__status--${lesson.status.toLowerCase()}`}>
                  {lesson.status === "COMPLETED" ? <Check size={17} /> : lesson.status === "OPENED" ? <Play size={15} fill="currentColor" /> : lesson.order}
                </span>
                <span className="lesson-row__copy">
                  <strong>{lesson.title}</strong>
                  <small><Clock3 size={12} /> {lesson.durationMinutes} {minuteWord(lesson.durationMinutes)} · {lesson.pageCount} этапов · {statusLabel(lesson.status)}</small>
                </span>
                <ChevronRight size={19} />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function statusLabel(status: "NOT_STARTED" | "OPENED" | "COMPLETED") {
  if (status === "COMPLETED") return "пройден";
  if (status === "OPENED") return "продолжить";
  return "не начат";
}

function minuteWord(count: number) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return "минут";
  if (last === 1) return "минута";
  if (last >= 2 && last <= 4) return "минуты";
  return "минут";
}

export function LessonPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromRoute = new URLSearchParams(location.search).get("from") === "route";
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [current, setCurrent] = useState(0);
  const [checkpointAnswers, setCheckpointAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    void preloadImage(robotAssets.teaching, "high");
    Promise.all([api.lesson(lessonId, controller.signal).then((data) => {
      const first = data.pages[0];
      if (first?.kind === "CONTENT" && first.illustration) void preloadImage(first.illustration.src, "high");
      return data;
    }), api.openLesson(lessonId)])
      .then(([lessonData]) => setLesson(lessonData))
      .catch((reason: unknown) => {
        if (!isAbortError(reason)) setError(true);
      });
    return () => controller.abort();
  }, [lessonId]);

  const page = lesson?.pages[current];
  useEffect(() => {
    if (!lesson || !page) return;
    let cancelled = false;
    const currentImage = page.kind === "CONTENT" ? page.illustration?.src : undefined;
    // Warm only the next illustration, after the visible image has loaded.
    // This avoids competing with the current page on slow mobile connections.
    const ready = currentImage ? preloadImage(currentImage, "high") : Promise.resolve();
    void ready.then(() => {
      if (cancelled) return;
      const nextImage = lesson.pages.slice(current + 1).find((item) => item.kind === "CONTENT" && item.illustration);
      if (nextImage?.kind === "CONTENT" && nextImage.illustration) void preloadImage(nextImage.illustration.src);
      const nextPage = lesson.pages[current + 1];
      if (nextPage) void preloadImage(nextPage.kind === "CHECKPOINT" ? robotAssets.thinking : (current + 1) % 2 === 0 ? robotAssets.teaching : robotAssets.reading);
    });
    return () => { cancelled = true; };
  }, [lesson, current, page]);
  const selectedCheckpointAnswer = page?.kind === "CHECKPOINT" ? checkpointAnswers[page.id] : undefined;
  const checkpointIsCorrect = page?.kind === "CHECKPOINT" && selectedCheckpointAnswer
    ? selectedCheckpointAnswer === page.question.correctOptionId
    : false;
  const isLastPage = lesson ? current === lesson.pages.length - 1 : false;

  function moveTo(index: number) {
    if (!lesson) return;
    setCurrent(Math.max(0, Math.min(index, lesson.pages.length - 1)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="page page--light page--flow lesson-page">
      <FlowTopBar title="Урок" onBack={() => fromRoute ? navigate("/route") : lesson ? navigate(`/learn/${lesson.courseId}`) : navigate("/learn")} />
      {error ? <FlowError /> : !lesson || !page ? <FlowLoading /> : (
        <>
          <div className="lesson-flow-progress" aria-label={`Этап ${current + 1} из ${lesson.pages.length}`}>
            <div><span>Этап {current + 1} из {lesson.pages.length}</span><strong>{Math.round(((current + 1) / lesson.pages.length) * 100)}%</strong></div>
            <i><b style={{ width: `${((current + 1) / lesson.pages.length) * 100}%` }} /></i>
          </div>

          <section className="lesson-flow-hero">
            <div>
              <span className="lesson-hero__meta"><BookOpen size={14} /> {lesson.durationMinutes} минут</span>
              <h1>{lesson.title}</h1>
              <p>{page.eyebrow}</p>
            </div>
            <img src={page.kind === "CHECKPOINT" ? robotAssets.thinking : current % 2 === 0 ? robotAssets.teaching : robotAssets.reading} alt={page.kind === "CHECKPOINT" ? "Робот размышляет" : "Робот объясняет тему"} />
          </section>

          {page.kind === "CONTENT" ? (
            <article className={`lesson-page-card lesson-page-card--${page.sectionType.toLowerCase()} ${["crypto-basics", "blockchain", "finance", "law-russia"].includes(lesson.courseId) ? "lesson-page-card--source" : ""}`}>
              <span className="lesson-page-card__icon">
                {page.sectionType === "EXAMPLE" ? <Lightbulb size={21} /> : page.sectionType === "RISK" ? <TriangleAlert size={21} /> : page.sectionType === "KEY_TAKEAWAY" ? <Sparkles size={21} /> : <BookOpen size={21} />}
              </span>
              <span className="lesson-page-card__eyebrow">{page.eyebrow}</span>
              <h2>{page.title}</h2>
              {page.illustration && (
                <LessonIllustration key={page.illustration.src} {...page.illustration}/>
              )}
              <LessonMarkdown body={page.body} />
            </article>
          ) : (
            <article className="lesson-checkpoint">
              <span className="lesson-page-card__eyebrow">{page.eyebrow}</span>
              <h2>{page.title}</h2>
              <p className="lesson-checkpoint__question">{page.question.text}</p>
              <div className="lesson-checkpoint__options" role="radiogroup" aria-label="Варианты ответа">
                {page.question.options.map((option) => {
                  const answered = Boolean(selectedCheckpointAnswer);
                  const selected = selectedCheckpointAnswer === option.id;
                  const correct = answered && option.id === page.question.correctOptionId;
                  const wrong = answered && selected && !correct;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={answered}
                      className={`lesson-checkpoint__option ${selected ? "selected" : ""} ${correct ? "correct" : ""} ${wrong ? "wrong" : ""}`}
                      onClick={() => setCheckpointAnswers((answers) => ({ ...answers, [page.id]: option.id }))}
                    >
                      <span>{correct ? <Check size={16} /> : wrong ? <XCircle size={16} /> : <Circle size={16} />}</span>{option.text}
                    </button>
                  );
                })}
              </div>
              {selectedCheckpointAnswer && (
                <aside className={`checkpoint-feedback ${checkpointIsCorrect ? "checkpoint-feedback--correct" : "checkpoint-feedback--wrong"}`}>
                  {checkpointIsCorrect ? <CheckCircle2 size={21} /> : <TriangleAlert size={21} />}
                  <div><strong>{checkpointIsCorrect ? "Верно — связь понята" : "Не страшно — разберём сейчас"}</strong><p>{page.question.explanation}</p></div>
                </aside>
              )}
            </article>
          )}

          <div className="lesson-flow-actions">
            <button type="button" className="secondary-cta" disabled={current === 0} onClick={() => moveTo(current - 1)}>Назад</button>
            {isLastPage ? (
              <Link className="primary-cta" to={`/lessons/${lesson.id}/quiz${fromRoute ? "?from=route" : ""}`}>Итоговый тест <ArrowRight size={19} /></Link>
            ) : (
              <button type="button" className="primary-cta" disabled={page.kind === "CHECKPOINT" && !selectedCheckpointAnswer} onClick={() => moveTo(current + 1)}>Далее <ArrowRight size={19} /></button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function QuizPage() {
  const { lessonId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    api.quiz(lessonId, controller.signal).then(setQuiz).catch((reason: unknown) => {
      if (!isAbortError(reason)) setError(true);
    });
    return () => controller.abort();
  }, [lessonId]);

  const question = quiz?.questions[current];
  const isLast = quiz ? current === quiz.questions.length - 1 : false;
  const selected = question ? answers[question.id] : undefined;

  async function next() {
    if (!quiz || !question || !selected) return;
    if (!isLast) {
      setCurrent((value) => value + 1);
      return;
    }
    setSubmitting(true);
    const payload: QuizAnswer[] = quiz.questions.map((item) => ({ questionId: item.id, optionIds: [answers[item.id]!] }));
    try {
      const result = await api.submitQuiz(quiz.id, payload);
      navigate(`/quiz/result${location.search}`, { replace: true, state: { result, lessonTitle: quiz.lessonTitle } });
    } catch {
      setError(true);
      setSubmitting(false);
    }
  }

  return (
    <div className="page page--light page--flow quiz-page">
      <FlowTopBar title="Итоговый тест" onBack={() => navigate(`/lessons/${lessonId}${location.search}`)} />
      {error ? <FlowError /> : !quiz || !question ? <FlowLoading /> : (
        <>
          <div className="quiz-progress-row">
            <span>Вопрос {current + 1} из {quiz.questions.length}</span>
            <strong>{Math.round(((current + 1) / quiz.questions.length) * 100)}%</strong>
          </div>
          <div className="quiz-progress"><i style={{ width: `${((current + 1) / quiz.questions.length) * 100}%` }} /></div>

          <section className="quiz-card">
            <img src={robotAssets.thinking} alt="Робот размышляет" />
            <span className="quiz-card__label">Итоговая проверка · нужно 67%</span>
            <h1>{question.text}</h1>
            <div className="quiz-options" role="radiogroup" aria-label="Варианты ответа">
              {question.options.map((option) => {
                const checked = selected === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="radio"
                    aria-checked={checked}
                    className={`quiz-option ${checked ? "quiz-option--selected" : ""}`}
                    onClick={() => setAnswers((value) => ({ ...value, [question.id]: option.id }))}
                  >
                    <span>{checked ? <Check size={15} /> : <Circle size={15} />}</span>{option.text}
                  </button>
                );
              })}
            </div>
          </section>

          <div className="quiz-actions">
            <button type="button" className="secondary-cta" disabled={current === 0} onClick={() => setCurrent((value) => value - 1)}>Назад</button>
            <button type="button" className="primary-cta primary-cta--button" disabled={!selected || submitting} onClick={next}>{submitting ? "Проверяем…" : isLast ? "Завершить" : "Далее"} <ArrowRight size={18} /></button>
          </div>
        </>
      )}
    </div>
  );
}

type ResultState = { result: QuizResult; lessonTitle: string };

export function QuizResultPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fromRoute = new URLSearchParams(location.search).get("from") === "route";
  const state = location.state as ResultState | null;

  if (!state) {
    return <div className="page page--light page--flow"><FlowTopBar title="Результат" onBack={() => navigate("/learn")} /><FlowError message="Результат не найден. Пройди тест ещё раз." /></div>;
  }

  const { result, lessonTitle } = state;
  const message = result.scorePercent === 100 ? "Отлично! Основа усвоена." : result.passed ? "Тема понята — можно двигаться дальше." : "Пока рано закрывать тему.";
  const mistakes = result.details.filter((detail) => !detail.correct);

  return (
    <div className="page page--light page--flow result-page">
      <FlowTopBar title="Результат" onBack={() => navigate(backDestination({ fromRoute, parent: `/learn/${result.courseId}` }))} />
      <section className="result-hero">
        <div className="result-orbit"><span>{result.scorePercent}%</span><img src={result.passed ? robotAssets.celebrating : robotAssets.thinking} alt={result.passed ? "Робот празднует результат" : "Робот помогает разобрать ошибки"} /></div>
        <span className="result-eyebrow">{result.passed ? "Итоговый тест пройден" : `Нужно не меньше ${result.passingScorePercent}%`}</span>
        <h1>{message}</h1>
        <p>{lessonTitle}</p>
      </section>

      <div className="result-stats">
        <div><strong>{result.correctAnswers}/{result.totalQuestions}</strong><span>Правильных ответов</span></div>
        <div><strong>{result.courseProgress.percent}%</strong><span>Прогресс направления</span></div>
      </div>

      <aside className={`result-note ${result.passed ? "" : "result-note--retry"}`}>
        {result.passed ? <CheckCircle2 size={22} /> : <TriangleAlert size={22} />}
        <div><strong>{result.passed ? "Урок завершён, прогресс сохранён" : "Попытка сохранена, урок остаётся открытым"}</strong><p>{result.passed ? "Ты ответил правильно минимум на две трети вопросов." : "Вернись к разбору ошибок и повтори итоговый тест. Поверхностный результат не засчитывается как освоение темы."}</p></div>
      </aside>

      {mistakes.length > 0 && (
        <section className="result-review">
          <span className="result-eyebrow">Разбор ошибок</span>
          <h2>Что стоит повторить</h2>
          {mistakes.map((detail) => (
            <article key={detail.questionId}>
              <strong>{detail.questionText}</strong>
              <p><b>Твой ответ:</b> {detail.selectedOptionText}</p>
              <p><b>Правильный ответ:</b> {detail.correctOptionText}</p>
              <small>{detail.explanation}</small>
            </article>
          ))}
        </section>
      )}

      <div className="result-actions">
        {fromRoute && result.passed && <button className="primary-cta primary-cta--button" type="button" onClick={() => navigate("/route")}>Остановка пройдена · к маршруту <ArrowRight size={18}/></button>}
        {!fromRoute && result.passed && <button className="primary-cta primary-cta--button" type="button" onClick={() => navigate(contextualFollowUp(result.courseId))}>Продолжить в сервисе <ArrowRight size={18}/></button>}
        {!fromRoute && result.nextLessonId && result.passed && <button className="primary-cta primary-cta--button" type="button" onClick={() => navigate(`/lessons/${result.nextLessonId}`)}>Следующий урок <ArrowRight size={18} /></button>}
        {!result.passed && <button className="primary-cta primary-cta--button" type="button" onClick={() => navigate(`/lessons/${result.lessonId}${location.search}`)}>Повторить материал <BookOpen size={18} /></button>}
        <button className="secondary-wide" type="button" onClick={() => navigate(`/lessons/${result.lessonId}/quiz${location.search}`, { replace: true })}><RotateCcw size={17} /> Пройти ещё раз</button>
        <Link to={`/learn/${result.courseId}`}>Вернуться к направлению</Link>
      </div>
    </div>
  );
}

function FlowLoading() {
  return <div className="flow-loading flow-loading--lesson" role="status" aria-label="Загружаем учебный материал">
    <section className="flow-loading__hero"><span className="skeleton__eyebrow" /><b className="skeleton__line skeleton__line--wide" /><b className="skeleton__line" /></section>
    <section className="flow-loading__content"><span className="skeleton__line skeleton__line--wide" /><span className="skeleton__line skeleton__line--wide" /><span className="skeleton__line" /><span className="skeleton__line skeleton__line--wide" /></section>
    <section className="flow-loading__answer"><i /><span><b className="skeleton__line skeleton__line--wide" /><b className="skeleton__line" /></span></section>
  </div>;
}

function FlowError({ message = "Не удалось загрузить экран" }: { message?: string }) {
  return <div className="flow-error"><strong>{message}</strong><span>Проверь локальный API и попробуй ещё раз.</span></div>;
}
