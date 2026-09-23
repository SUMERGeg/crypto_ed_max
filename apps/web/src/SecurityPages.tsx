import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  KeyRound,
  LockKeyhole,
  MessageCircleWarning,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "./api";
import { robotAssets } from "./robot";
import type { SecurityCase, SecurityCaseResult, SecurityCaseSummary, SecurityProgress, ThreatCard, ThreatSummary } from "./types";

function useSecurityRemote<T>(loader: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(false);
    setData(null);
    loader(controller.signal).then(setData).catch((reason: unknown) => {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      setError(true);
    });
    return () => controller.abort();
  }, [loader, version]);

  return { data, error, retry: () => setVersion((current) => current + 1) };
}

export function SecurityPage() {
  const [tab, setTab] = useState<"cases" | "threats">("cases");
  const loader = useCallback(async (signal: AbortSignal) => {
    const [cases, progress, threats] = await Promise.all([api.securityCases(signal), api.securityProgress(signal), api.threats(signal)]);
    return { cases, progress, threats };
  }, []);
  const { data, error, retry } = useSecurityRemote(loader);

  return (
    <div className="security-page">
      <section className="security-hero">
        <div>
          <span>Защита начинается с паузы</span>
          <h1>Безопасность</h1>
          <p>Тренируйся замечать опасные признаки до того, как нажмёшь кнопку.</p>
        </div>
        <img src={robotAssets.teaching} alt="Крипто-помощник объясняет правила безопасности" />
      </section>

      {data && <SecurityProgressCard progress={data.progress} />}

      <div className="security-tabs" role="tablist" aria-label="Разделы безопасности">
        <button className={tab === "cases" ? "active" : ""} onClick={() => setTab("cases")} role="tab" aria-selected={tab === "cases"}><ShieldCheck size={15}/> Учебные кейсы</button>
        <button className={tab === "threats" ? "active" : ""} onClick={() => setTab("threats")} role="tab" aria-selected={tab === "threats"}><BookOpenCheck size={15}/> База угроз</button>
      </div>

      {error ? <SecurityError retry={retry}/> : !data ? <SecuritySkeleton/> : tab === "cases"
        ? <SecurityCases cases={data.cases}/>
        : <ThreatList threats={data.threats}/>} 

      <aside className="security-rule">
        <KeyRound size={18}/>
        <div><strong>Главное правило</strong><p>Никому не передавай фразу восстановления, private key, пароль или код подтверждения — даже «поддержке».</p></div>
      </aside>
    </div>
  );
}

function SecurityProgressCard({ progress }: { progress: SecurityProgress }) {
  return (
    <section className="security-progress">
      <div><span>Пройдено кейсов</span><strong>{progress.completedCases} из {progress.totalCases}</strong></div>
      <b>{progress.percent}%</b>
      <div className="security-progress__track"><i style={{ width: `${progress.percent}%` }}/></div>
    </section>
  );
}

function SecurityCases({ cases }: { cases: SecurityCaseSummary[] }) {
  return (
    <section className="security-list">
      <div className="security-heading"><div><span>Безопасно ошибаться можно здесь</span><h2>Выбери ситуацию</h2></div><strong>{cases.length}</strong></div>
      {cases.map((item, index) => (
        <NavLink to={`/security/cases/${item.id}`} className="security-case-card" key={item.id}>
          <span className={`security-case-icon security-case-icon--${index % 5}`}>{caseIcon(index)}</span>
          <div>
            <span className="security-card-meta">Кейс {item.order} · {item.estimatedMinutes} мин.</span>
            <h3>{item.title}</h3>
            <p>{item.shortDescription}</p>
            <small>{item.difficulty === "BEGINNER" ? "Начальный" : "Чуть сложнее"}</small>
          </div>
          <span className={`security-case-status ${item.completed ? "completed" : ""}`}>{item.completed ? <Check size={13}/> : <ChevronRight size={15}/>}</span>
        </NavLink>
      ))}
    </section>
  );
}

function ThreatList({ threats }: { threats: ThreatSummary[] }) {
  return (
    <section className="threat-list">
      <div className="security-heading"><div><span>Короткий справочник</span><h2>Типовые угрозы</h2></div><strong>{threats.length}</strong></div>
      <p className="threat-intro">Один признак ещё не доказывает обман. Смотри на сочетание признаков и всегда проверяй источник.</p>
      {threats.map((threat, index) => (
        <NavLink className="threat-row" to={`/security/threats/${threat.id}`} key={threat.id}>
          <span>{threatIcon(threat.id, index)}</span>
          <div><strong>{threat.title}</strong><p>{threat.definition}</p></div>
          <ChevronRight size={15}/>
        </NavLink>
      ))}
    </section>
  );
}

export function SecurityCasePage() {
  const { caseId = "" } = useParams();
  const navigate = useNavigate();
  const fromRoute = new URLSearchParams(useLocation().search).get("from") === "route";
  const loader = useCallback((signal: AbortSignal) => api.securityCase(caseId, signal), [caseId]);
  const { data, error, retry } = useSecurityRemote(loader);
  const [selectedOptionId, setSelectedOptionId] = useState("");
  const [result, setResult] = useState<SecurityCaseResult | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  useEffect(() => {
    setSelectedOptionId("");
    setResult(null);
    setSubmitError(false);
  }, [caseId]);

  async function submit() {
    if (!selectedOptionId || submitting) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const response = await api.submitSecurityCase(caseId, selectedOptionId);
      setResult(response);
      document.querySelector(".screen-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function repeat() {
    setSelectedOptionId("");
    setResult(null);
    setSubmitError(false);
  }

  return (
    <div className="security-flow-page">
      <SecurityTopBar title={result ? "Разбор решения" : "Учебный кейс"} onBack={() => navigate(fromRoute ? "/route" : "/security")}/>
      {error ? <SecurityError retry={retry}/> : !data ? <SecuritySkeleton rows={3}/> : result
        ? <SecurityResult item={data} result={result} repeat={repeat} fromRoute={fromRoute}/>
        : <SecurityQuestion item={data} selectedOptionId={selectedOptionId} setSelectedOptionId={setSelectedOptionId} submit={submit} submitting={submitting} submitError={submitError}/>} 
    </div>
  );
}

function SecurityQuestion({ item, selectedOptionId, setSelectedOptionId, submit, submitting, submitError }: { item: SecurityCase; selectedOptionId: string; setSelectedOptionId: (id: string) => void; submit: () => void; submitting: boolean; submitError: boolean }) {
  return (
    <>
      <header className="case-heading">
        <div><span>Кейс {item.order} · {item.estimatedMinutes} минуты</span><h1>{item.title}</h1></div>
        <img src={robotAssets.thinking} alt="Помощник обдумывает ситуацию"/>
      </header>
      {item.completed && <div className="case-completed"><CheckCircle2 size={14}/> Ты уже проходил этот кейс. Можно выбрать действие ещё раз.</div>}
      <section className="case-situation">
        <span><MessageCircleWarning size={15}/> Ситуация</span>
        <p>{item.scenarioText}</p>
      </section>
      <section className="case-context"><Eye size={17}/><div><strong>Что ещё известно</strong><p>{item.context}</p></div></section>
      <section className="case-options">
        <div className="security-heading"><div><span>Здесь нет реальных операций</span><h2>Как ты поступишь?</h2></div></div>
        {item.options.map((option, index) => (
          <button key={option.id} className={selectedOptionId === option.id ? "selected" : ""} onClick={() => setSelectedOptionId(option.id)} aria-pressed={selectedOptionId === option.id}>
            <i>{String.fromCharCode(65 + index)}</i><span>{option.text}</span><b>{selectedOptionId === option.id && <Check size={14}/>}</b>
          </button>
        ))}
      </section>
      {submitError && <p className="security-submit-error">Не удалось сохранить выбор. Попробуй ещё раз.</p>}
      <button className="security-primary" onClick={submit} disabled={!selectedOptionId || submitting}>{submitting ? "Сохраняем…" : "Проверить решение"}</button>
      <p className="case-note">Кейс создан для обучения. Он не просит вводить пароли, фразы или настоящие данные кошелька.</p>
    </>
  );
}

function SecurityResult({ item, result, repeat, fromRoute }: { item: SecurityCase; result: SecurityCaseResult; repeat: () => void; fromRoute: boolean }) {
  const safe = result.safetyLevel === "SAFE";
  return (
    <div className="security-result">
      <section className={`result-hero result-hero--${safe ? "safe" : "risky"}`}>
        <div><span>{safe ? "Безопасный выбор" : "Рискованный выбор"}</span><h1>{safe ? "Хорошая пауза перед действием" : "Здесь легко потерять контроль"}</h1><p>{safe ? "Ты сначала проверяешь факты и не раскрываешь секреты." : "Ошибка в учебном кейсе безопасна — разберём, что именно насторожило."}</p></div>
        <img src={safe ? robotAssets.celebrating : robotAssets.teaching} alt="Крипто-помощник объясняет результат"/>
      </section>

      <section className="result-feedback"><span>{safe ? <ShieldCheck size={18}/> : <ShieldAlert size={18}/>}</span><div><strong>Разбор твоего действия</strong><p>{result.feedback}</p></div></section>
      <section className="result-consequences"><TriangleAlert size={18}/><div><strong>Что могло произойти</strong><p>{result.consequences}</p></div></section>

      <section className="red-flags">
        <div className="security-heading"><div><span>Остановись и проверь</span><h2>Красные флаги</h2></div><strong>{result.redFlags.length}</strong></div>
        {result.redFlags.map((flag) => <p key={flag}><X size={12}/><span>{flag}</span></p>)}
      </section>

      <section className="security-takeaway"><LockKeyhole size={21}/><div><span>Что нужно запомнить</span><p>{result.takeaway}</p></div></section>

      <section className="related-threats">
        <strong>Связанные угрозы</strong>
        <div>{result.threatIds.map((threatId) => <NavLink key={threatId} to={`/security/threats/${threatId}`}>{threatLabel(threatId)} <ChevronRight size={12}/></NavLink>)}</div>
      </section>

      {fromRoute ? <NavLink className="security-primary security-primary--link" to="/route">Остановка пройдена · к маршруту <ChevronRight size={15}/></NavLink> : result.nextCaseId ? <NavLink className="security-primary security-primary--link" to={`/security/cases/${result.nextCaseId}`}>Следующий кейс <ChevronRight size={15}/></NavLink> : <NavLink className="security-primary security-primary--link" to="/security">Вернуться к списку <ChevronRight size={15}/></NavLink>}
      <button className="security-repeat" onClick={repeat}><RotateCcw size={14}/> Пройти этот кейс ещё раз</button>
      <p className="case-note">Разбор относится к этой учебной ситуации. В реальности один признак не гарантирует, что сообщение безопасно или опасно.</p>
    </div>
  );
}

export function ThreatPage() {
  const { threatId = "" } = useParams();
  const navigate = useNavigate();
  const loader = useCallback((signal: AbortSignal) => api.threat(threatId, signal), [threatId]);
  const { data, error, retry } = useSecurityRemote(loader);
  return (
    <div className="security-flow-page threat-page">
      <SecurityTopBar title="Карточка угрозы" onBack={() => navigate("/security")}/>
      {error ? <SecurityError retry={retry}/> : !data ? <SecuritySkeleton rows={4}/> : <ThreatContent threat={data}/>} 
    </div>
  );
}

function ThreatContent({ threat }: { threat: ThreatCard }) {
  return (
    <article className="threat-content">
      <header><span><ShieldAlert size={17}/></span><div><small>База угроз</small><h1>{threat.title}</h1></div></header>
      <p className="threat-definition">{threat.definition}</p>
      <ThreatSection icon={<RefreshCw/>} title="Как работает схема"><p>{threat.howItWorks}</p></ThreatSection>
      <ThreatSection icon={<CircleAlert/>} title="Характерные признаки"><BulletList items={threat.signs}/></ThreatSection>
      <section className="threat-example"><span>Пример</span><p>{threat.example}</p></section>
      <ThreatSection icon={<ShieldCheck/>} title="Как защититься" tone="safe"><BulletList items={threat.protection}/></ThreatSection>
      <ThreatSection icon={<AlertTriangle/>} title="Чего не делать" tone="danger"><BulletList items={threat.neverDo}/></ThreatSection>
      <NavLink className="security-primary security-primary--link" to="/security">Вернуться в безопасность <ChevronRight size={15}/></NavLink>
      <p className="case-note">Карточка помогает заметить типовые признаки, но не заменяет проверку конкретного сообщения, адреса или сервиса.</p>
    </article>
  );
}

function ThreatSection({ icon, title, tone = "", children }: { icon: React.ReactNode; title: string; tone?: string; children: React.ReactNode }) {
  return <section className={`threat-section ${tone ? `threat-section--${tone}` : ""}`}><div className="threat-section__title"><span>{icon}</span><h2>{title}</h2></div>{children}</section>;
}

function BulletList({ items }: { items: string[] }) {
  return <div className="threat-bullets">{items.map((item) => <p key={item}><i/><span>{item}</span></p>)}</div>;
}

function SecurityTopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="security-topbar"><button onClick={onBack} aria-label="Назад"><ArrowLeft size={19}/></button><strong>{title}</strong><span><ShieldCheck size={17}/></span></header>;
}

function SecurityError({ retry }: { retry: () => void }) {
  return <div className="security-error"><AlertTriangle size={24}/><strong>Не удалось загрузить раздел</strong><p>Попробуй ещё раз — другие разделы приложения продолжат работать.</p><button onClick={retry}><RefreshCw size={14}/> Повторить</button></div>;
}

function SecuritySkeleton({ rows = 5 }: { rows?: number }) {
  return <div className="security-skeleton" role="status" aria-label="Загружаем материалы по безопасности">
    <div className="security-skeleton__heading"><span><b/><b/></span><i/></div>
    {Array.from({ length: rows }, (_, index) => <article key={index}>
      <i className="security-skeleton__icon"/>
      <span className="security-skeleton__lines"><b/><b/><b/></span>
      <i className="security-skeleton__action"/>
    </article>)}
  </div>;
}

function caseIcon(index: number) {
  return [<MessageCircleWarning/>, <Sparkles/>, <KeyRound/>, <Clock3/>, <TriangleAlert/>][index] ?? <ShieldAlert/>;
}

function threatIcon(threatId: string, index: number) {
  if (threatId === "crypto-money-mule") return <Banknote/>;
  return [<Eye/>, <MessageCircleWarning/>, <KeyRound/>, <Sparkles/>, <LockKeyhole/>][index % 5];
}

function threatLabel(id: string) {
  const labels: Record<string, string> = {
    "fake-support": "Поддельная поддержка", "seed-phrase-theft": "Кража фразы", "social-engineering": "Социальная инженерия",
    "fake-exchange": "Поддельная биржа", ponzi: "Финансовая пирамида", phishing: "Фишинг", "wallet-approval": "Опасное разрешение",
    "account-takeover": "Захват аккаунта", "pump-and-dump": "Pump & Dump",
  };
  return labels[id] ?? id;
}
