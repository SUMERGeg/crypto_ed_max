import { dailyScenarioPoints } from "./scenario-points.js";
import { extraHistoricalScenarios } from "./scenario-catalog-extra.js";

export type HistoricalPoint = { at: string; priceRub: number };

export type HistoricalAsset = {
  symbol: string;
  name: string;
  color: string;
  points: HistoricalPoint[];
};

export type HistoricalEventCategory = "MARKET" | "WORLD" | "REGULATION" | "TECHNOLOGY" | "SECURITY" | "COMPANY";

export type HistoricalEvent = {
  id: string;
  at: string;
  title: string;
  summary: string;
  context: string;
  category: HistoricalEventCategory;
  affectedAssets: string[];
  sourceName: string;
  sourceUrl: string;
};

export type HistoricalScenario = {
  id: string;
  version: string;
  title: string;
  description: string;
  startAt: string;
  endAt: string;
  startingBalanceRub: number;
  difficulty: "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
  educationalFocus: string[];
  benchmark: { kind: "BUY_AND_HOLD"; assetSymbol: string; label: string };
  durationMs: number;
  assets: HistoricalAsset[];
  events: HistoricalEvent[];
  dataSource: { name: string; url: string; retrievedAt: string };
};

const globalShockScenario: HistoricalScenario = {
  id: "global-shock-2020",
  version: "1.2.0",
  title: "Глобальный шок и восстановление",
  description: "Пройди путь рынка с марта 2020 по март 2021 года. Новости появляются только тогда, когда они стали известны.",
  startAt: "2020-03-01T00:00:00Z",
  endAt: "2021-03-01T00:00:00Z",
  startingBalanceRub: 100_000,
  difficulty: "BEGINNER",
  educationalFocus: ["Не продавать в панике", "Отделять новость от реакции рынка", "Сравнивать решение с простым планом"],
  benchmark: { kind: "BUY_AND_HOLD", assetSymbol: "BTC", label: "Купить Bitcoin в начале и держать" },
  durationMs: 6 * 60_000,
  assets: [
    {
      symbol: "BTC",
      name: "Bitcoin",
      color: "#f5a13a",
      points: dailyScenarioPoints.BTC,
    },
    {
      symbol: "ETH",
      name: "Ethereum",
      color: "#718bd5",
      points: dailyScenarioPoints.ETH,
    },
  ],
  events: [
    {
      id: "who-pandemic",
      at: "2020-03-11T00:00:00Z",
      title: "ВОЗ назвала вспышку пандемией",
      summary: "ВОЗ официально охарактеризовала COVID-19 как пандемию. Неопределённость одновременно выросла на рынках разных стран.",
      context: "Крипторынок не изолирован от мира. Когда людям и компаниям срочно нужны обычные деньги, они могут продавать даже активы, которые раньше считали защитными.",
      category: "WORLD",
      affectedAssets: ["BTC", "ETH"],
      sourceName: "Всемирная организация здравоохранения",
      sourceUrl: "https://www.who.int/news-room/speeches/item/who-director-general-s-opening-remarks-at-the-media-briefing-on-covid-19---11-march-2020",
    },
    {
      id: "crypto-liquidity-crash",
      at: "2020-03-12T00:00:00Z",
      title: "Bitcoin пережил одно из крупнейших дневных падений",
      summary: "На фоне общей паники BTC за день потерял около половины цены. Продажи с заёмными деньгами усиливали друг друга.",
      context: "Когда цена падает, биржи принудительно закрывают слишком рискованные позиции. Эти новые продажи могут вызвать следующую волну падения — получается цепная реакция.",
      category: "MARKET",
      affectedAssets: ["BTC", "ETH"],
      sourceName: "Coinbase, разбор рыночного падения",
      sourceUrl: "https://www.coinbase.com/en-de/learn/market-updates/around-the-block-issue-4",
    },
    {
      id: "fed-emergency-response",
      at: "2020-03-15T00:00:00Z",
      title: "ФРС снизила ставку почти до нуля",
      summary: "Центральный банк США резко снизил ставку и объявил крупные покупки облигаций, чтобы поддержать работу финансовой системы.",
      context: "Более дешёвые деньги не поднимают криптовалюты автоматически. Но они меняют условия для всех рынков и могут влиять на готовность участников брать риск.",
      category: "WORLD",
      affectedAssets: ["BTC", "ETH"],
      sourceName: "Федеральная резервная система США",
      sourceUrl: "https://www.federalreserve.gov/newsevents/pressreleases/monetary20200315a1.htm",
    },
    {
      id: "bitcoin-halving",
      at: "2020-05-11T00:00:00Z",
      title: "Награда за новый блок Bitcoin уменьшилась",
      summary: "Такое событие происходит примерно раз в четыре года. Новых монет стало появляться в два раза меньше.",
      context: "Правило предложения известно заранее, поэтому участники могли ожидать событие. Сам факт халвинга не говорит, какой будет цена на следующий день.",
      category: "TECHNOLOGY",
      affectedAssets: ["BTC"],
      sourceName: "Bitcoin block 630 000",
      sourceUrl: "https://mempool.space/block-height/630000",
    },
    {
      id: "uniswap-v2-launch",
      at: "2020-05-18T00:00:00Z",
      title: "Uniswap v2 запущен в сети Ethereum",
      summary: "Новая версия протокола позволила обменивать больше пар токенов и добавила новые функции для программ внутри Ethereum.",
      context: "Рост приложений создаёт спрос на использование сети, но одновременно может увеличить комиссии и риски ошибок в новых программах.",
      category: "TECHNOLOGY",
      affectedAssets: ["ETH"],
      sourceName: "Uniswap Labs",
      sourceUrl: "https://blog.uniswap.org/launch-uniswap-v2",
    },
    {
      id: "twitter-bitcoin-scam",
      at: "2020-07-15T00:00:00Z",
      title: "Взлом Twitter использовали для кражи Bitcoin",
      summary: "Злоумышленники получили доступ к известным аккаунтам и публиковали ложное обещание вернуть вдвое больше отправленных BTC.",
      context: "Запись известного человека не доказывает, что предложение настоящее. Необратимый перевод нельзя вернуть только потому, что сообщение оказалось поддельным.",
      category: "SECURITY",
      affectedAssets: ["BTC"],
      sourceName: "Министерство юстиции США",
      sourceUrl: "https://www.justice.gov/usao-ndca/pr/three-individuals-charged-alleged-roles-twitter-hack",
    },
    {
      id: "occ-crypto-custody",
      at: "2020-07-22T00:00:00Z",
      title: "OCC разъяснило банкам хранение криптоактивов",
      summary: "Американский банковский регулятор подтвердил, что национальные банки могут оказывать клиентам услуги хранения криптографических ключей.",
      context: "Регуляторное разъяснение может снизить неопределённость для компаний. Оно не делает сам актив безрисковым и не гарантирует рост цены.",
      category: "REGULATION",
      affectedAssets: ["BTC", "ETH"],
      sourceName: "Office of the Comptroller of the Currency",
      sourceUrl: "https://www.occ.treas.gov/news-issuances/news-releases/2020/nr-occ-2020-98.html",
    },
    {
      id: "microstrategy-bitcoin",
      at: "2020-08-11T00:00:00Z",
      title: "MicroStrategy купила Bitcoin на 250 млн долларов",
      summary: "Публичная компания сообщила о покупке 21 454 BTC как части управления своими денежными резервами.",
      context: "Крупная покупка привлекает внимание, но решение одной компании не является советом другим инвесторам. У компании свои цели, срок и допустимый риск.",
      category: "COMPANY",
      affectedAssets: ["BTC"],
      sourceName: "SEC, отчёт MicroStrategy 8-K",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1050446/000119312520215604/d921849d8k.htm",
    },
    {
      id: "paypal-crypto-service",
      at: "2020-10-21T00:00:00Z",
      title: "PayPal объявил покупку и хранение криптовалют",
      summary: "Компания открыла клиентам в США возможность покупать, хранить и продавать несколько криптовалют внутри PayPal.",
      context: "Доступ через знакомый сервис снижает технический порог входа. Но простая кнопка покупки не уменьшает волатильность и рыночный риск актива.",
      category: "COMPANY",
      affectedAssets: ["BTC", "ETH"],
      sourceName: "PayPal Newsroom",
      sourceUrl: "https://newsroom.paypal-corp.com/2020-10-21-PayPal-Launches-New-Service-Enabling-Users-to-Buy-Hold-and-Sell-Cryptocurrency",
    },
    {
      id: "ethereum-beacon-genesis",
      at: "2020-12-01T12:00:00Z",
      title: "Запущена Beacon Chain Ethereum",
      summary: "Начала работать отдельная цепочка с валидаторами и залогом ETH — первый большой этап перехода Ethereum к Proof of Stake.",
      context: "Крупное обновление сети выполняется поэтапно. Запуск первого этапа показывает технический прогресс, но не означает, что весь переход уже завершён.",
      category: "TECHNOLOGY",
      affectedAssets: ["ETH"],
      sourceName: "Ethereum Foundation",
      sourceUrl: "https://blog.ethereum.org/2020/11/04/eth2-quick-update-no-19",
    },
    {
      id: "bitcoin-breaks-20k",
      at: "2020-12-16T00:00:00Z",
      title: "Bitcoin впервые поднялся выше 20 000 долларов",
      summary: "Цена превысила максимум предыдущего цикла. Интерес в социальных сетях и внимание крупных участников быстро росли.",
      context: "Новый максимум часто усиливает страх упустить рост. Но сам рекорд не показывает, продолжится ли движение и насколько глубоким может быть откат.",
      category: "MARKET",
      affectedAssets: ["BTC"],
      sourceName: "Coinbase Market Update",
      sourceUrl: "https://www.coinbase.com/learn/market-updates/this-week-in-bitcoin-price-12-21",
    },
    {
      id: "sec-ripple-case",
      at: "2020-12-22T00:00:00Z",
      title: "SEC подала иск против Ripple",
      summary: "Американский регулятор заявил, что продажи XRP представляли собой незарегистрированное предложение ценных бумаг.",
      context: "Правовой спор вокруг одного актива способен влиять на площадки и настроение всего рынка. Но выводы по XRP нельзя автоматически переносить на Bitcoin или Ethereum.",
      category: "REGULATION",
      affectedAssets: ["XRP"],
      sourceName: "U.S. Securities and Exchange Commission",
      sourceUrl: "https://www.sec.gov/newsroom/press-releases/2020-338",
    },
    {
      id: "occ-stablecoin-payments",
      at: "2021-01-04T00:00:00Z",
      title: "OCC разъяснило использование блокчейнов и стейблкоинов банками",
      summary: "Регулятор подтвердил, что национальные банки США могут использовать распределённые сети и некоторые стейблкоины для разрешённых платёжных операций.",
      context: "Разъяснение относится к конкретным банковским функциям и условиям. Оно не означает одобрение любого токена или любой схемы со стейблкоином.",
      category: "REGULATION",
      affectedAssets: ["ETH", "USDC"],
      sourceName: "Office of the Comptroller of the Currency",
      sourceUrl: "https://www.occ.treas.gov/news-issuances/news-releases/2021/nr-occ-2021-2.html",
    },
    {
      id: "cme-ether-futures",
      at: "2021-02-08T00:00:00Z",
      title: "CME запустила регулируемые фьючерсы на Ether",
      summary: "На крупной площадке появился денежно-расчётный контракт, через который профессиональные участники могли управлять риском цены ETH.",
      context: "Новый инструмент расширяет доступ крупных участников, но позволяет ставить и на рост, и на падение. Его запуск сам по себе не задаёт направление цены.",
      category: "MARKET",
      affectedAssets: ["ETH"],
      sourceName: "CME Group",
      sourceUrl: "https://www.cmegroup.com/notices/market-regulation/2021/02/MSN02-03-21.html",
    },
    {
      id: "tesla-bitcoin",
      at: "2021-02-08T00:00:00Z",
      title: "Tesla сообщила о покупке Bitcoin",
      summary: "Компания раскрыла покупку Bitcoin на 1,5 млрд долларов. Новость быстро привлекла внимание к рынку.",
      context: "Размер компании делает новость заметной, но не превращает её решение в универсальный план. Покупка уже произошла до того, как рынок увидел отчёт.",
      category: "COMPANY",
      affectedAssets: ["BTC"],
      sourceName: "SEC, годовой отчёт Tesla",
      sourceUrl: "https://www.sec.gov/Archives/edgar/data/1318605/000156459021004599/tsla-10k_20201231.htm",
    },
  ],
  dataSource: {
    name: "Binance public market data, daily close for BTCRUB and ETHRUB",
    url: "https://developers.binance.com/docs/binance-spot-api-docs/rest-api/market-data-endpoints#klinecandlestick-data",
    retrievedAt: "2026-08-16T20:05:00Z",
  },
};

export const historicalScenarios: HistoricalScenario[] = [globalShockScenario, ...extraHistoricalScenarios];
