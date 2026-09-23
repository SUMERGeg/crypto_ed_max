export type RouteStopType = "LESSON" | "SECURITY_CASE" | "REPLAY";
export type RouteChapter = "crypto-basics" | "blockchain" | "finance" | "law-russia";

type RouteStopDefinition = {
  id: string;
  type: RouteStopType;
  contentId: string;
  title: string;
  chapter: RouteChapter;
};

const lesson = (contentId: string, title: string, chapter: RouteChapter): RouteStopDefinition => ({ id: `lesson:${contentId}`, type: "LESSON", contentId, title, chapter });
const securityCase = (contentId: string, title: string, chapter: RouteChapter): RouteStopDefinition => ({ id: `case:${contentId}`, type: "SECURITY_CASE", contentId, title, chapter });
const replay = (contentId: string, title: string, chapter: RouteChapter): RouteStopDefinition => ({ id: `replay:${contentId}`, type: "REPLAY", contentId, title, chapter });

export const routeCatalog: readonly RouteStopDefinition[] = [
  lesson("crypto-intro", "Что такое криптовалюта", "crypto-basics"),
  securityCase("fake-support-seed", "Поддержка просит фразу восстановления", "crypto-basics"),
  lesson("crypto-bitcoin", "Bitcoin", "crypto-basics"),
  lesson("crypto-tokens", "Монеты и токены", "crypto-basics"),
  securityCase("airdrop-phishing-link", "Подарочные токены по ссылке", "crypto-basics"),
  lesson("crypto-ethereum", "Ethereum и смарт-контракты", "crypto-basics"),
  lesson("crypto-stablecoins", "Как устроены стейблкоины", "crypto-basics"),
  securityCase("guaranteed-exchange-profit", "Биржа обещает гарантированный доход", "crypto-basics"),
  replay("boom-2017-2018", "Первый криптобум и резкое падение", "crypto-basics"),
  lesson("blockchain-ledger", "Блокчейн и распределённый реестр", "blockchain"),
  lesson("blockchain-transactions", "Как создаётся транзакция", "blockchain"),
  lesson("blockchain-blocks", "Как транзакция попадает в блок", "blockchain"),
  securityCase("urgent-friend-transfer", "Знакомый срочно просит USDT", "blockchain"),
  lesson("blockchain-consensus", "Как сеть приходит к согласию", "blockchain"),
  lesson("blockchain-pow", "Bitcoin: майнинг и Proof of Work", "blockchain"),
  replay("global-shock-2020", "Глобальный шок и восстановление", "blockchain"),
  lesson("finance-risk-return", "Риск и доходность", "finance"),
  lesson("finance-diversification", "Диверсификация", "finance"),
  replay("winter-2021-2022", "Эйфория, крах проектов и криптозима", "finance"),
  lesson("finance-volatility", "Волатильность и ликвидность", "finance"),
  lesson("finance-cap-fees", "Капитализация, предложение и комиссии", "finance"),
  securityCase("pump-group-signal", "Закрытая группа знает, какой токен вырастет", "finance"),
  lesson("finance-risk-plan", "План управления риском", "finance"),
  replay("recovery-2023-2024", "Восстановление и ожидание больших денег", "finance"),
  lesson("law-status", "Криптовалюта и закон", "law-russia"),
  lesson("law-taxes", "Налоги и учёт операций", "law-russia"),
  lesson("law-payments", "Цифровой рубль: как он устроен", "law-russia"),
  lesson("law-mining", "Майнинг и обязанности участника", "law-russia"),
  lesson("law-safe-check", "Как проверять правовую информацию", "law-russia"),
  replay("modern-2024-2025", "Регулирование и информационный шум", "law-russia"),
];

type RouteProgress = {
  completedLessonIds: readonly string[];
  completedCaseIds: readonly string[];
  completedScenarioIds: readonly string[];
};

export function buildRecommendedRoute(progress: RouteProgress) {
  const lessons = new Set(progress.completedLessonIds);
  const cases = new Set(progress.completedCaseIds);
  const scenarios = new Set(progress.completedScenarioIds);
  const completed = routeCatalog.map((stop) => stop.type === "LESSON" ? lessons.has(stop.contentId) : stop.type === "SECURITY_CASE" ? cases.has(stop.contentId) : scenarios.has(stop.contentId));
  const firstIncomplete = completed.indexOf(false);
  const currentIndex = firstIncomplete < 0 ? null : firstIncomplete;
  return {
    version: 1,
    total: routeCatalog.length,
    completedCount: completed.filter(Boolean).length,
    continuousCompletedCount: currentIndex ?? routeCatalog.length,
    currentIndex,
    finished: currentIndex === null,
    stops: routeCatalog.map((stop, index) => ({ ...stop, number: index + 1, completed: completed[index]!, available: completed[index]! || index === currentIndex })),
  };
}
