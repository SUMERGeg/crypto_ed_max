import { ArrowLeft, BarChart3, BookOpenCheck, ChevronRight, GraduationCap, Home, ShieldCheck, Sparkles, TrendingUp, X } from "lucide-react";
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
  robot: string;
  robotAlt: string;
  icon: ReactNode;
  preview: "home" | "learn" | "practice" | "market";
  tip: string;
};

const slides: Slide[] = [
  {
    eyebrow: "Добро пожаловать",
    title: "Вот главная страница",
    text: "Здесь собраны все направления сервиса. Выбирай то, что интересно сейчас — доступ к разделам открыт сразу.",
    robot: robotAssets.waving,
    robotAlt: "Крипто-помощник приветствует пользователя",
    icon: <Sparkles/>,
    preview: "home",
    tip: "Нажми на карточку направления, чтобы начать. Если не знаешь, с чего идти, начни с «Учиться».",
  },
  {
    eyebrow: "Учись",
    title: "Здесь проходят уроки",
    text: "В «Учиться» темы идут от простых к более сложным. У каждого урока есть понятное объяснение и итоговая проверка.",
    robot: robotAssets.reading,
    robotAlt: "Крипто-помощник читает учебный материал",
    icon: <BookOpenCheck/>,
    preview: "learn",
    tip: "Выбери тему на карточке. Прогресс сохранится, поэтому урок можно продолжить в другой раз.",
  },
  {
    eyebrow: "Практика и безопасность",
    title: "Здесь можно практиковаться",
    text: "В Market Replay ты принимаешь решения на виртуальные деньги. А в «Безопасности» учишься замечать опасные сообщения и схемы.",
    robot: robotAssets.teaching,
    robotAlt: "Крипто-помощник объясняет практическое задание",
    icon: <ShieldCheck/>,
    preview: "practice",
    tip: "В тренажёре нет реальных сделок: это место, чтобы спокойно увидеть последствия решений. Кейсы безопасности тоже учебные.",
  },
  {
    eyebrow: "Рынок",
    title: "Здесь следят за рынком",
    text: "В разделе «Рынок» собраны цены, графики и новости. Они помогают наблюдать за происходящим, но не подсказывают, что покупать или продавать.",
    robot: robotAssets.thinking,
    robotAlt: "Крипто-помощник изучает рыночные данные",
    icon: <BarChart3/>,
    preview: "market",
    tip: "Смотри на цену вместе с графиком и новостями. Данные могут меняться — это не сигнал покупать или продавать.",
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

function OnboardingPreview({ kind }: { kind: Slide["preview"] }) {
  if (kind === "home") return <section className="onboarding-preview onboarding-preview--home" aria-label="Пример главной страницы">
    <header><strong>Главная</strong><Sparkles/></header>
    <div className="preview-greeting"><b>Привет!</b><small>Выбери направление</small></div>
    <div className="preview-home-grid">
      <article className="is-highlight"><BookOpenCheck/><b>Учиться</b><small>Короткие уроки</small></article>
      <article><BarChart3/><b>Практика</b><small>Market Replay</small></article>
      <article><ShieldCheck/><b>Безопасность</b><small>Учебные кейсы</small></article>
      <article><TrendingUp/><b>Крипторынок</b><small>Цены и новости</small></article>
    </div>
  </section>;

  if (kind === "learn") return <section className="onboarding-preview onboarding-preview--learn" aria-label="Пример раздела Учиться">
    <header><strong>Учиться</strong><span>Все темы</span></header>
    <p>Выбери тему для первого урока</p>
    <article className="preview-course is-highlight"><i><BookOpenCheck/></i><div><b>Криптовалюты</b><small>5 уроков · основы цифровых денег</small><em><span/></em></div><ChevronRight/></article>
    <article className="preview-course"><i><GraduationCap/></i><div><b>Blockchain</b><small>5 уроков · как устроена сеть</small><em><span/></em></div><ChevronRight/></article>
  </section>;

  if (kind === "practice") return <section className="onboarding-preview onboarding-preview--practice" aria-label="Пример разделов Практика и Безопасность">
    <header><strong>Практика</strong><span>Без реальных денег</span></header>
    <article className="preview-replay is-highlight"><BarChart3/><div><small>Market Replay</small><b>Пройди прошлый рынок</b><span>Виртуальный баланс · новости · разбор</span></div><ChevronRight/></article>
    <article className="preview-security"><ShieldCheck/><div><b>Безопасность</b><small>Учебные кейсы про опасные схемы</small></div><ChevronRight/></article>
  </section>;

  return <section className="onboarding-preview onboarding-preview--market" aria-label="Пример раздела Рынок">
    <header><strong>Крипторынок</strong><span>Цены и новости</span></header>
    <article className="preview-price is-highlight"><i>₿</i><div><b>Bitcoin (BTC)</b><small>Текущая цена</small></div><strong>5 460 879 ₽<em>+2,4%</em></strong></article>
    <div className="preview-chart"><span/><span/><span/><svg viewBox="0 0 260 78" role="img" aria-label="Пример графика цены"><polyline points="0,62 20,51 35,58 53,32 72,43 90,27 110,41 128,37 145,18 163,31 182,20 200,38 220,14 240,25 260,7"/></svg></div>
    <article className="preview-news"><TrendingUp/><div><b>Открытые новости</b><small>Смотри контекст движения цены</small></div><ChevronRight/></article>
  </section>;
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
          <section className="onboarding-intro">
            <div>
              <span>{slide.icon}{slide.eyebrow}</span>
              <h1>{slide.title}</h1>
              <p>{slide.text}</p>
            </div>
          </section>
          <OnboardingPreview kind={slide.preview}/>
          <aside className="onboarding-guide">
            <img src={slide.robot} alt={slide.robotAlt}/>
            <div><span>Робот-помощник</span><p>{slide.tip}</p></div>
          </aside>
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
