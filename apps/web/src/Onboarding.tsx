import { ArrowLeft, BarChart3, BookOpenCheck, ChevronRight, GraduationCap, Home, ShieldCheck, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api, getApiUserId } from "./api";
import { robotAssets } from "./robot";
import { useTheme } from "./theme";
import type { OnboardingState, OnboardingStatus } from "./types";

const storageKey = () => `crypto-education-onboarding:${getApiUserId()}`;

type Slide = {
  eyebrow: string;
  title: string;
  text: string;
  note?: string;
  robot: string;
  robotAlt: string;
  icon: ReactNode;
  points: Array<{ icon: ReactNode; title: string; text: string }>;
};

const slides: Slide[] = [
  {
    eyebrow: "Добро пожаловать",
    title: "Разберёмся в криптовалютах спокойно",
    text: "КриптоКласс помогает понять цифровые деньги простыми словами, потренироваться без реальных денег и научиться замечать риски.",
    robot: robotAssets.waving,
    robotAlt: "Крипто-помощник приветствует пользователя",
    icon: <Sparkles/>,
    points: [
      { icon: <GraduationCap/>, title: "Понятные объяснения", text: "От основ к более сложным темам." },
      { icon: <ShieldCheck/>, title: "Безопасный подход", text: "Без обещаний дохода и советов купить актив." },
    ],
  },
  {
    eyebrow: "Учись",
    title: "Сначала разберись в основах",
    text: "Темы идут от простых к более сложным. Уроки разбиты на короткие шаги, а итоговый тест помогает проверить главное.",
    robot: robotAssets.reading,
    robotAlt: "Крипто-помощник читает учебный материал",
    icon: <BookOpenCheck/>,
    points: [
      { icon: <BookOpenCheck/>, title: "Короткие страницы", text: "Одна новая мысль за один шаг." },
      { icon: <GraduationCap/>, title: "Прогресс сохраняется", text: "Можно остановиться и продолжить позже." },
    ],
  },
  {
    eyebrow: "Практика и безопасность",
    title: "Пробуй без риска для денег",
    text: "В Market Replay можно пройти прошлые рыночные периоды. В учебных кейсах — потренироваться замечать мошеннические схемы.",
    robot: robotAssets.teaching,
    robotAlt: "Крипто-помощник объясняет практическое задание",
    icon: <ShieldCheck/>,
    points: [
      { icon: <BarChart3/>, title: "Виртуальные решения", text: "Исторические цены, новости и разбор действий." },
      { icon: <ShieldCheck/>, title: "Опасные признаки", text: "Обещания дохода, давление и просьбы перевести деньги." },
    ],
  },
  {
    eyebrow: "Рынок",
    title: "Смотри на данные, а не на обещания",
    text: "В разделе «Рынок» собраны цены, графики и новости. Они помогают наблюдать за происходящим, но не являются советом покупать или продавать.",
    note: "Все разделы уже открыты. Начни с того, что интересно сейчас.",
    robot: robotAssets.thinking,
    robotAlt: "Крипто-помощник изучает рыночные данные",
    icon: <BarChart3/>,
    points: [
      { icon: <BarChart3/>, title: "Котировки и графики", text: "Данные по пяти основным активам." },
      { icon: <Home/>, title: "Выбор за тобой", text: "После знакомства откроется главная страница." },
    ],
  },
];

function readLocalState(): OnboardingState | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey()) ?? "null") as Partial<OnboardingState> | null;
    if (!value || !["NOT_STARTED", "IN_PROGRESS", "COMPLETED", "SKIPPED"].includes(value.status ?? "")) return null;
    if (!Number.isInteger(value.step) || Number(value.step) < 1 || Number(value.step) > 4) return null;
    return { status: value.status as OnboardingStatus, step: Number(value.step), version: 1, completedAt: value.completedAt ?? null };
  } catch {
    return null;
  }
}

function storeLocalState(state: OnboardingState) {
  localStorage.setItem(storageKey(), JSON.stringify(state));
}

function preferredState(remote: OnboardingState, local: OnboardingState | null) {
  if (remote.status === "COMPLETED" || remote.status === "SKIPPED") return remote;
  if (!local) return remote;
  if (local.status === "COMPLETED" || local.status === "SKIPPED" || local.step > remote.step) return local;
  return remote;
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [state, setState] = useState<OnboardingState | null>(null);
  const forceOpen = location.pathname === "/onboarding";

  useEffect(() => {
    const controller = new AbortController();
    api.onboarding(controller.signal)
      .then((remote) => {
        const chosen = preferredState(remote, readLocalState());
        storeLocalState(chosen);
        setState(chosen);
      })
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setState(readLocalState() ?? { status: "COMPLETED", step: 4, version: 1, completedAt: null });
      });
    return () => controller.abort();
  }, []);

  const finish = (next: OnboardingState) => {
    storeLocalState(next);
    setState(next);
    navigate("/", { replace: true });
  };

  if (!state) return <OnboardingLoading/>;
  if (forceOpen || state.status === "NOT_STARTED" || state.status === "IN_PROGRESS") {
    return <OnboardingPage initialStep={forceOpen ? 1 : state.step} onFinish={finish}/>;
  }
  return children;
}

function OnboardingLoading() {
  const { theme } = useTheme();
  return <main className="app-canvas" data-crypto-theme={theme}><section className="phone-shell onboarding-loading" role="status" aria-label="Открываем знакомство с сервисом"><i/><span/><span/><b/></section></main>;
}

function OnboardingPage({ initialStep, onFinish }: { initialStep: number; onFinish: (state: OnboardingState) => void }) {
  const { theme } = useTheme();
  const [step, setStep] = useState(Math.min(4, Math.max(1, initialStep)));
  const [saving, setSaving] = useState(false);
  const slide = slides[step - 1]!;
  const progress = useMemo(() => `${step} из ${slides.length}`, [step]);

  async function persist(status: Exclude<OnboardingStatus, "NOT_STARTED">, nextStep: number) {
    const optimistic: OnboardingState = {
      status,
      step: nextStep,
      version: 1,
      completedAt: status === "COMPLETED" || status === "SKIPPED" ? new Date().toISOString() : null,
    };
    storeLocalState(optimistic);
    try {
      const saved = await api.saveOnboarding(status, nextStep);
      storeLocalState(saved);
      return saved;
    } catch {
      return optimistic;
    }
  }

  async function next() {
    if (saving) return;
    setSaving(true);
    if (step === slides.length) {
      onFinish(await persist("COMPLETED", slides.length));
      return;
    }
    const nextStep = step + 1;
    await persist("IN_PROGRESS", nextStep);
    setStep(nextStep);
    setSaving(false);
  }

  async function back() {
    if (saving || step === 1) return;
    setSaving(true);
    const nextStep = step - 1;
    await persist("IN_PROGRESS", nextStep);
    setStep(nextStep);
    setSaving(false);
  }

  async function skip() {
    if (saving) return;
    setSaving(true);
    onFinish(await persist("SKIPPED", step));
  }

  return (
    <main className="app-canvas" data-crypto-theme={theme}>
      <section className={`phone-shell onboarding-page onboarding-page--${step}`}>
        <header className="onboarding-topbar">
          <button type="button" onClick={back} disabled={step === 1 || saving} aria-label="Предыдущий экран"><ArrowLeft/></button>
          <span>Знакомство · {progress}</span>
          <button type="button" onClick={skip} disabled={saving} aria-label="Пропустить знакомство"><X/></button>
        </header>

        <div className="onboarding-progress" aria-label={`Экран ${progress}`}>
          {slides.map((_, index) => <i key={index} className={index < step ? "active" : ""}/>) }
        </div>

        <div className="onboarding-content" key={step}>
          <section className="onboarding-hero">
            <div className="onboarding-hero__copy">
              <span>{slide.icon}{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>
            </div>
            <img src={slide.robot} alt={slide.robotAlt}/>
          </section>

          <section className="onboarding-points">
            {slide.points.map((point) => (
              <article key={point.title}>
                <i>{point.icon}</i>
                <div><strong>{point.title}</strong><p>{point.text}</p></div>
              </article>
            ))}
          </section>

          {slide.note && <aside className="onboarding-note"><Sparkles/><p>{slide.note}</p></aside>}
        </div>

        <footer className="onboarding-actions">
          <button type="button" className="primary-wide" onClick={next} disabled={saving}>
            {step === 1 ? "Посмотреть возможности" : step === slides.length ? "Перейти на главную" : "Далее"}
            <ChevronRight/>
          </button>
          <button type="button" className="onboarding-skip" onClick={skip} disabled={saving}>Пропустить знакомство</button>
        </footer>
      </section>
    </main>
  );
}
