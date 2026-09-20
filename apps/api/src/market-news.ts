export type MarketNewsCategory = "MARKET" | "LAW" | "SECURITY" | "TECHNOLOGY";

export type MarketNewsArticle = {
  id: string;
  title: string;
  preview: string;
  category: MarketNewsCategory;
  publishedAt: string;
  affectedAssets: string[];
  whatHappened: string;
  whyImportant: string;
  analysis: string;
  takeaway: string;
  sourceName: string;
  sourceUrl: string;
  disclaimer: string;
};

const disclaimer = "Материал подготовлен для обучения и не является инвестиционной рекомендацией.";

const news: MarketNewsArticle[] = [
  {
    id: "russia-crypto-market-law-2026",
    title: "В России приняли правила обращения криптовалют",
    preview: "Разбираем, кто сможет совершать операции через регулируемых посредников и почему лимит не делает вложение безопасным.",
    category: "LAW",
    publishedAt: "2026-07-21T10:00:00Z",
    affectedAssets: ["BTC", "ETH", "SOL", "TON", "LTC"],
    whatHappened: "Государственная Дума приняла закон о правилах обращения криптовалют в России. Банк России сообщил, что нормы должны вступить в силу 1 сентября 2026 года.",
    whyImportant: "Появляется регулируемая инфраструктура: операции смогут проходить через посредников, а для разных групп инвесторов будут действовать разные условия.",
    analysis: "Закон описывает доступ и контроль, но не обещает доходность и не страхует пользователя от падения цены. Лимит для неквалифицированного инвестора — это ограничение суммы, а не знак качества выбранного актива.",
    takeaway: "Регулируемый доступ уменьшает часть организационных рисков, но рыночный риск криптовалюты остаётся.",
    sourceName: "Банк России",
    sourceUrl: "https://www.cbr.ru/press/event/?id=32719",
    disclaimer,
  },
  {
    id: "ruble-stablecoins-discussion-2026",
    title: "Банк России предложил обсудить рублёвые стейблкоины",
    preview: "Стейблкоин старается держать заданную цену, но способ поддержки этой цены важнее названия.",
    category: "LAW",
    publishedAt: "2026-06-25T10:00:00Z",
    affectedAssets: ["USDT", "USDC"],
    whatHappened: "Банк России опубликовал консультативный доклад о возможном развитии рынка рублёвых стейблкоинов и запросил мнение участников рынка.",
    whyImportant: "Стейблкоины используются как связующее звено между обычными деньгами и крипторынком. От правил резервов и погашения зависит, насколько надёжно токен удерживает заявленную цену.",
    analysis: "Консультативный доклад — это обсуждение, а не уже действующее правило. До появления окончательных норм важно проверять, кто выпускает токен, чем он обеспечен и как его можно обменять обратно.",
    takeaway: "Слово «стабильный» не отменяет риск эмитента, резервов и площадки хранения.",
    sourceName: "Банк России",
    sourceUrl: "https://www.cbr.ru/press/event/?id=32664",
    disclaimer,
  },
  {
    id: "fbi-crypto-fraud-report-2026",
    title: "ФБР сообщило о росте потерь в криптомошенничестве",
    preview: "Главный красный флаг — давление действовать быстро и переводить деньги на платформу, которую предложил незнакомец.",
    category: "SECURITY",
    publishedAt: "2026-04-06T14:00:00Z",
    affectedAssets: ["BTC", "ETH", "USDT"],
    whatHappened: "В отчёте о преступлениях в интернете ФБР сообщило, что жалобы, связанные с криптовалютами, дали самую большую сумму заявленных потерь среди рассмотренных направлений.",
    whyImportant: "Мошеннические приложения могут показывать выдуманную прибыль и даже разрешить небольшой первый вывод, чтобы пользователь поверил и внёс больше.",
    analysis: "График прибыли внутри неизвестного приложения не доказывает, что активы действительно куплены. Проверять нужно юридическое лицо, адрес сайта, условия вывода и независимые источники — до первого перевода.",
    takeaway: "Не переводите деньги под давлением. Настоящая поддержка и правоохранительные органы не просят переместить активы в «безопасный кошелёк».",
    sourceName: "Federal Bureau of Investigation",
    sourceUrl: "https://www.fbi.gov/news/press-releases/cryptocurrency-and-ai-scams-bilk-americans-of-billions",
    disclaimer,
  },
  {
    id: "sec-crypto-interpretation-2026",
    title: "SEC уточнила подход к разным видам криптоактивов",
    preview: "Один и тот же токен и способ его продажи могут оцениваться по-разному — важны конкретные условия.",
    category: "MARKET",
    publishedAt: "2026-03-17T15:00:00Z",
    affectedAssets: ["BTC", "ETH", "SOL"],
    whatHappened: "SEC опубликовала разъяснение о применении американских законов о ценных бумагах к отдельным криптоактивам и операциям, включая стейкинг, майнинг, airdrop и обёрнутые токены.",
    whyImportant: "Более ясные определения помогают площадкам и разработчикам понимать требования. Для пользователя это может влиять на доступность отдельных продуктов и способы их продажи.",
    analysis: "Разъяснение не означает, что любой криптоактив автоматически безопасен или разрешён во всех ситуациях. Правовой статус зависит не только от названия токена, но и от обещаний продавца и структуры сделки.",
    takeaway: "Не переносите юридический вывод об одном продукте на весь крипторынок.",
    sourceName: "U.S. Securities and Exchange Commission",
    sourceUrl: "https://www.sec.gov/newsroom/press-releases/2026-30-sec-clarifies-application-federal-securities-laws-crypto-assets",
    disclaimer,
  },
  {
    id: "ethereum-priorities-2026",
    title: "Ethereum обозначил технические приоритеты на 2026 год",
    preview: "Разработчики сосредоточились на масштабировании, удобстве кошельков и устойчивости основной сети.",
    category: "TECHNOLOGY",
    publishedAt: "2026-02-18T12:00:00Z",
    affectedAssets: ["ETH"],
    whatHappened: "Ethereum Foundation описала направления работы протокола: увеличение возможностей сети, улучшение пользовательского опыта и усиление защиты основной сети.",
    whyImportant: "Изменения протокола могут влиять на комиссии, работу приложений и требования к операторам узлов. Но многие идеи проходят долгую проверку до включения в обновление.",
    analysis: "План разработки — это направление, а не обещание точной даты и не прогноз цены ETH. Между исследованием, тестовой сетью и запуском в основной сети могут пройти месяцы.",
    takeaway: "Оценивайте техническую новость по тому, что уже запущено, что только тестируется и какие риски ещё проверяются.",
    sourceName: "Ethereum Foundation",
    sourceUrl: "https://blog.ethereum.org/2026/02/18/protocol-priorities-update-2026",
    disclaimer,
  },
];

export function listMarketNews() {
  return news.map(({ whatHappened: _what, whyImportant: _why, analysis: _analysis, takeaway: _takeaway, sourceName: _sourceName, sourceUrl: _sourceUrl, disclaimer: _disclaimer, ...summary }) => summary);
}

export function getMarketNews(newsId: string) {
  return news.find((item) => item.id === newsId);
}
