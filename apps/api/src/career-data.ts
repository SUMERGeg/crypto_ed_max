import { randomUUID } from "node:crypto";
import type { CareerRepository } from "./career-persistence.js";

type InterestAxis = "R" | "I" | "A" | "S" | "E" | "C";
type StyleAxis = "AN" | "PR" | "ST" | "AD" | "SC" | "CO" | "IN" | "CR";
type RoleKey = "DEV" | "SECURITY" | "DATA" | "PRODUCT" | "COMPLIANCE" | "MARKET_RESEARCH" | "INVESTOR" | "COMMUNITY" | "PARTNERSHIPS" | "OPS";
type ScoreKey = InterestAxis | StyleAxis | RoleKey;
type ScoreVector = Partial<Record<ScoreKey, number>>;

type QuestionOption = {
  id: string;
  text: string;
  score: number | null;
  vector: ScoreVector;
};

type Question = {
  id: string;
  order: number;
  block: number;
  blockTitle: string;
  type: "SCALE_INTEREST" | "SCALE_SELF" | "SINGLE_CHOICE";
  text: string;
  reverse: boolean;
  vector: ScoreVector;
  options: QuestionOption[];
};

type CareerRole = {
  id: string;
  key: RoleKey;
  group: "TECH" | "ANALYSIS" | "PRODUCT" | "PEOPLE" | "MARKET";
  title: string;
  shortDescription: string;
  interestTargets: Partial<Record<InterestAxis, number>>;
  styleTargets: Partial<Record<StyleAxis, number>>;
  criticalThresholds: Partial<Record<StyleAxis, number>>;
  dailyTasks: string[];
  challenge: string;
  entrySkills: string[];
  learningPath: string[];
  practiceTask: string;
  accent: string;
  disclaimer?: string;
};

export type CareerAttempt = {
  id: string;
  userId: string;
  questionnaireVersion: string;
  algorithmVersion: string;
  status: "IN_PROGRESS" | "COMPLETED";
  startedAt: string;
  completedAt: string | null;
  answers: Record<string, string>;
  result: CareerResult | null;
};

type RoleResult = {
  role: ReturnType<typeof publicRole>;
  fitPercent: number;
  reasons: string[];
  challenge: string;
};

type CareerResult = {
  attemptId: string;
  completedAt: string;
  headline: string;
  summary: string;
  quality: { level: "STABLE" | "CLOSE" | "MIXED"; label: string; text: string };
  topRoles: RoleResult[];
  allRoleScores: Array<{ roleId: string; title: string; fitPercent: number }>;
  dimensions: Array<{ id: InterestAxis | StyleAxis; label: string; value: number; description: string }>;
  disclaimer: string;
};

const QUESTIONNAIRE_VERSION = "career-1.0";
const ALGORITHM_VERSION = "career-fit-1.0";
const interestAxes: InterestAxis[] = ["R", "I", "A", "S", "E", "C"];
const styleAxes: StyleAxis[] = ["AN", "PR", "ST", "AD", "SC", "CO", "IN", "CR"];
const roleKeys: RoleKey[] = ["DEV", "SECURITY", "DATA", "PRODUCT", "COMPLIANCE", "MARKET_RESEARCH", "INVESTOR", "COMMUNITY", "PARTNERSHIPS", "OPS"];

const blockTitles = [
  "Что вам интересно делать",
  "Предпочитаемые задачи",
  "Как вы обычно действуете",
  "Ситуации из криптоиндустрии",
  "Смешанные ситуации",
] as const;

const interestOptionLabels = ["Совсем не хотелось бы", "Скорее не хотелось бы", "Не уверен", "Скорее хотелось бы", "Очень хотелось бы"];
const selfOptionLabels = ["Совсем не про меня", "Скорее не про меня", "Иногда", "В основном про меня", "Очень похоже на меня"];

function scaleQuestion(order: number, text: string, vector: ScoreVector, kind: "SCALE_INTEREST" | "SCALE_SELF", reverse = false): Question {
  const labels = kind === "SCALE_INTEREST" ? interestOptionLabels : selfOptionLabels;
  return {
    id: `career-q${order}`,
    order,
    block: Math.ceil(order / 8),
    blockTitle: blockTitles[Math.ceil(order / 8) - 1] ?? blockTitles[0],
    type: kind,
    text,
    reverse,
    vector,
    options: labels.map((label, score) => ({ id: `career-q${order}-o${score}`, text: label, score, vector: {} })),
  };
}

function scenarioQuestion(order: number, text: string, options: Array<[string, ScoreVector]>): Question {
  return {
    id: `career-q${order}`,
    order,
    block: Math.ceil(order / 8),
    blockTitle: blockTitles[Math.ceil(order / 8) - 1] ?? blockTitles[0],
    type: "SINGLE_CHOICE",
    text,
    reverse: false,
    vector: {},
    options: options.map(([label, vector], index) => ({ id: `career-q${order}-o${index}`, text: label, score: null, vector })),
  };
}

const roles: CareerRole[] = [
  {
    id: "blockchain-developer", key: "DEV", group: "TECH", title: "Разработчик блокчейн-продуктов",
    shortDescription: "Создаёт смарт-контракты, кошельки и приложения, которые работают с блокчейном.",
    interestTargets: { I: .9, R: .75, C: .55 }, styleTargets: { AN: .9, PR: .8, ST: .65, AD: .55 }, criticalThresholds: { AN: .45 },
    dailyTasks: ["Писать и проверять код", "Разбирать техническую документацию", "Тестировать крайние случаи", "Исправлять ошибки и улучшать производительность"],
    challenge: "Большая часть работы — это внимательная отладка. Результат не всегда виден сразу.",
    entrySkills: ["логика и алгоритмы", "один язык программирования", "основы блокчейна"],
    learningPath: ["Курс «Криптовалюты»", "Курс «Blockchain»", "Урок об Ethereum и смарт-контрактах"],
    practiceTask: "Разобрать простой учебный смарт-контракт по строкам и объяснить, что делает каждая часть.", accent: "#6258ea",
  },
  {
    id: "smart-contract-security", key: "SECURITY", group: "TECH", title: "Аудитор смарт-контрактов",
    shortDescription: "Ищет уязвимости, проверяет логику контрактов и объясняет последствия ошибок.",
    interestTargets: { I: .95, C: .8, R: .5 }, styleTargets: { PR: .95, AN: .9, SC: .75, ST: .7 }, criticalThresholds: { PR: .55, AN: .5 },
    dailyTasks: ["Читать чужой код", "Моделировать способы атаки", "Проверять редкие и опасные случаи", "Писать точные отчёты о рисках"],
    challenge: "Цена пропущенной ошибки может быть высокой, поэтому работа требует долгой концентрации.",
    entrySkills: ["программирование", "мышление злоумышленника", "аккуратная письменная речь"],
    learningPath: ["Раздел «Безопасность»", "Курс «Blockchain»", "Ethereum и смарт-контракты"],
    practiceTask: "Найти логическую ошибку в безопасном учебном контракте и описать возможное последствие.", accent: "#24a879",
  },
  {
    id: "onchain-data-analyst", key: "DATA", group: "ANALYSIS", title: "Аналитик блокчейн-данных",
    shortDescription: "Исследует транзакции, строит метрики и находит закономерности в данных блокчейна.",
    interestTargets: { I: .95, C: .8, R: .35 }, styleTargets: { AN: .95, PR: .85, ST: .7, CR: .35 }, criticalThresholds: { AN: .5, PR: .45 },
    dailyTasks: ["Проверять качество данных", "Писать SQL-запросы", "Строить графики и показатели", "Объяснять ограничения выводов"],
    challenge: "Данные бывают неполными, а красивый график ещё не означает правильный вывод.",
    entrySkills: ["таблицы и SQL", "статистика на базовом уровне", "визуализация данных"],
    learningPath: ["Крипторынок", "Курс «Blockchain»", "Market Replay"],
    practiceTask: "По готовому набору транзакций найти необычную активность и сформулировать две возможные причины.", accent: "#3d8fd8",
  },
  {
    id: "crypto-product-manager", key: "PRODUCT", group: "PRODUCT", title: "Продуктовый менеджер",
    shortDescription: "Соединяет потребности пользователей, разработку, дизайн, безопасность и цели продукта.",
    interestTargets: { E: .8, S: .7, I: .65, A: .45 }, styleTargets: { IN: .8, CO: .8, AD: .85, CR: .7, ST: .55 }, criticalThresholds: { AD: .4, CO: .4 },
    dailyTasks: ["Исследовать проблемы пользователей", "Определять приоритеты", "Согласовывать решения команды", "Проверять, принесло ли изменение пользу"],
    challenge: "Приходится принимать решения без полной информации и отвечать за компромиссы.",
    entrySkills: ["исследование пользователей", "ясная постановка задач", "понимание технологий"],
    learningPath: ["Курс «Криптовалюты»", "Безопасность", "Крипторынок"],
    practiceTask: "Выбрать проблему пользователя, сформулировать её одним предложением и задать критерий успешного решения.", accent: "#7c61e8",
  },
  {
    id: "crypto-compliance-aml", key: "COMPLIANCE", group: "ANALYSIS", title: "Специалист по комплаенсу и AML",
    shortDescription: "Оценивает риски операций и помогает криптосервису работать по правилам.",
    interestTargets: { C: .95, I: .75, S: .45 }, styleTargets: { PR: .95, ST: .9, SC: .75, CO: .55 }, criticalThresholds: { PR: .55, ST: .5 },
    dailyTasks: ["Проверять процессы и документы", "Исследовать подозрительные случаи", "Фиксировать основания решений", "Объяснять требования коллегам"],
    challenge: "Правила меняются, а решения часто требуют подробного и аккуратного обоснования.",
    entrySkills: ["внимание к правилам", "анализ операций", "деловая письменная речь"],
    learningPath: ["Россия и право", "Раздел «Безопасность»", "Новости регулирования"],
    practiceTask: "Разобрать учебную подозрительную операцию и записать факты, которые требуют дополнительной проверки.", accent: "#2ca77d",
  },
  {
    id: "crypto-market-researcher", key: "MARKET_RESEARCH", group: "MARKET", title: "Исследователь крипторынка",
    shortDescription: "Изучает проекты, рыночные циклы и новости, формируя сценарии вместо точных обещаний.",
    interestTargets: { I: .95, C: .6, A: .45 }, styleTargets: { AN: .95, AD: .75, SC: .8, CR: .65, PR: .55 }, criticalThresholds: { AN: .5, SC: .4 },
    dailyTasks: ["Собирать и сравнивать источники", "Проверять рыночные гипотезы", "Исследовать экономику проектов", "Писать разборы со сценариями"],
    challenge: "Даже качественный анализ не предсказывает цену наверняка, а информационного шума очень много.",
    entrySkills: ["работа с источниками", "основы экономики", "сценарное мышление"],
    learningPath: ["Крипторынок", "Циклы крипторынка", "Market Replay"],
    practiceTask: "Выбрать событие и составить два противоположных рыночных сценария с явными допущениями.", accent: "#468be7",
  },
  {
    id: "crypto-investor", key: "INVESTOR", group: "MARKET", title: "Инвестор / участник рынка",
    shortDescription: "Оценивает возможности, формулирует инвестиционный тезис и управляет риском в неопределённой среде.",
    interestTargets: { I: .8, E: .65, C: .55 }, styleTargets: { SC: .95, AN: .85, AD: .8, PR: .7, ST: .55 }, criticalThresholds: { SC: .65, AN: .5 },
    dailyTasks: ["Формулировать тезис и условия его отмены", "Оценивать возможные потери", "Вести журнал решений", "Пересматривать сценарии при новых фактах"],
    challenge: "Направление связано с финансовыми потерями и сильным эмоциональным давлением.",
    entrySkills: ["управление риском", "финансовая дисциплина", "проверка источников"],
    learningPath: ["Финансовые основы", "Циклы крипторынка", "Безопасность", "Market Replay"],
    practiceTask: "Пройти Market Replay: до первой сделки записать тезис, максимальный риск и условие выхода.", accent: "#e89538",
    disclaimer: "Это направление не является рекомендацией вкладывать реальные деньги. Сначала проверяйте подход только в симуляторе.",
  },
  {
    id: "crypto-community-educator", key: "COMMUNITY", group: "PEOPLE", title: "Специалист по сообществу и образованию",
    shortDescription: "Объясняет сложные темы, помогает пользователям и создаёт образовательные форматы.",
    interestTargets: { S: .95, A: .75, E: .55 }, styleTargets: { CO: .95, CR: .85, IN: .6, AD: .65 }, criticalThresholds: { CO: .5 },
    dailyTasks: ["Отвечать на вопросы пользователей", "Писать понятные материалы", "Проводить встречи", "Собирать и передавать обратную связь"],
    challenge: "Общение бывает эмоционально насыщенным, а одну тему приходится объяснять очень разным людям.",
    entrySkills: ["простая речь", "эмпатия", "работа с обратной связью"],
    learningPath: ["Все базовые уроки", "Безопасность", "Новостные разборы"],
    practiceTask: "Взять сложный криптотермин и объяснить его новичку в пяти коротких предложениях.", accent: "#b26ad7",
  },
  {
    id: "crypto-ecosystem-partnerships", key: "PARTNERSHIPS", group: "PEOPLE", title: "Менеджер партнёрств",
    shortDescription: "Ищет точки сотрудничества, ведёт переговоры и помогает запускать совместные инициативы.",
    interestTargets: { E: .95, S: .7, A: .4 }, styleTargets: { IN: .95, CO: .85, AD: .75, ST: .55 }, criticalThresholds: { IN: .45, CO: .45 },
    dailyTasks: ["Искать подходящих партнёров", "Готовить предложения", "Проводить переговоры", "Координировать договорённости"],
    challenge: "В работе много отказов и зависимостей от людей, на которых нельзя полностью повлиять.",
    entrySkills: ["переговоры", "презентации", "понимание интересов сторон"],
    learningPath: ["Курс «Криптовалюты»", "Крипторынок", "Новости индустрии"],
    practiceTask: "Подготовить короткое предложение о сотрудничестве: общая цель, вклад каждой стороны и первый шаг.", accent: "#db6d80",
  },
  {
    id: "blockchain-infrastructure", key: "OPS", group: "TECH", title: "Инженер блокчейн-инфраструктуры",
    shortDescription: "Поддерживает узлы, серверы, мониторинг, релизы и стабильность технических систем.",
    interestTargets: { R: .95, I: .75, C: .7 }, styleTargets: { PR: .85, ST: .9, AD: .75, SC: .8, AN: .6 }, criticalThresholds: { ST: .5, SC: .45 },
    dailyTasks: ["Настраивать инфраструктуру", "Следить за мониторингом", "Автоматизировать повторяющиеся операции", "Восстанавливать систему после сбоев"],
    challenge: "Иногда нужно спокойно действовать в аварийной ситуации и не терять порядок шагов.",
    entrySkills: ["Linux и сети", "автоматизация", "наблюдаемость систем"],
    learningPath: ["Курс «Blockchain»", "Безопасность", "Технические основы сетей"],
    practiceTask: "Разобрать учебный сбой узла и составить короткий порядок диагностики и восстановления.", accent: "#397ec6",
  },
];

const questions: Question[] = [
  scaleQuestion(1, "Настроить новое устройство или программу так, чтобы всё заработало", { R: 1, I: .3 }, "SCALE_INTEREST"),
  scaleQuestion(2, "Найти причину странного результата в таблице или отчёте", { I: 1, C: .4, AN: .4 }, "SCALE_INTEREST"),
  scaleQuestion(3, "Придумать понятную подачу сложной темы", { A: 1, S: .4, CR: .5 }, "SCALE_INTEREST"),
  scaleQuestion(4, "Помочь человеку разобраться в незнакомом сервисе", { S: 1, CO: .5 }, "SCALE_INTEREST"),
  scaleQuestion(5, "Представить идею группе и убедить её попробовать", { E: 1, IN: .5, CO: .2 }, "SCALE_INTEREST"),
  scaleQuestion(6, "Вести точный список задач, сроков и изменений", { C: 1, ST: .5 }, "SCALE_INTEREST"),
  scaleQuestion(7, "Разобрать сложную систему по частям и понять, как она работает", { I: 1, R: .3, AN: .5 }, "SCALE_INTEREST"),
  scaleQuestion(8, "Координировать людей, когда у каждого своя задача", { E: .8, S: .5, IN: .4, ST: .3 }, "SCALE_INTEREST"),
  scaleQuestion(9, "Создать текст, схему или презентацию, которые легко запоминаются", { A: 1, S: .3, CR: .5 }, "SCALE_INTEREST"),
  scaleQuestion(10, "Проверить работу по списку и найти пропущенную мелочь", { C: 1, PR: .6 }, "SCALE_INTEREST"),
  scaleQuestion(11, "Восстановить работу системы после неожиданного сбоя", { R: 1, I: .5, AD: .3 }, "SCALE_INTEREST"),
  scaleQuestion(12, "Выслушать несколько мнений и помочь группе выбрать решение", { S: .8, E: .5, CO: .5 }, "SCALE_INTEREST"),
  scaleQuestion(13, "Я довожу задачу до конца, даже когда интересная часть уже закончилась", { ST: 1, SC: .3 }, "SCALE_SELF"),
  scaleQuestion(14, "Перед отправкой результата я обычно перепроверяю важные детали", { PR: 1, ST: .3 }, "SCALE_SELF"),
  scaleQuestion(15, "Если план внезапно меняется, я довольно быстро перестраиваюсь", { AD: 1, SC: .3 }, "SCALE_SELF"),
  scaleQuestion(16, "Я могу принять разумное решение, даже когда информации пока недостаточно", { AD: .8, AN: .3, IN: .2 }, "SCALE_SELF"),
  scaleQuestion(17, "Мне комфортно начинать разговор и договариваться с незнакомыми людьми", { CO: .6, IN: .8 }, "SCALE_SELF"),
  scaleQuestion(18, "Мне нравится надолго погружаться в одну сложную задачу без переключений", { AN: .8, PR: .4 }, "SCALE_SELF"),
  scaleQuestion(19, "Мне спокойнее, когда правила и зона ответственности сформулированы заранее", { ST: .8 }, "SCALE_SELF"),
  scaleQuestion(20, "Если никто не знает, с чего начать, я готов предложить первый план", { IN: 1, AD: .3 }, "SCALE_SELF"),
  scaleQuestion(21, "После ошибки мне важно понять причину и изменить процесс, чтобы она не повторилась", { AN: .5, PR: .5, ST: .4 }, "SCALE_SELF"),
  scaleQuestion(22, "Я часто бросаю начатое, когда появляется что-то более интересное", { ST: .8, SC: .5 }, "SCALE_SELF", true),
  scaleQuestion(23, "После критики мне трудно вернуться к работе, даже если замечание было полезным", { SC: .8, AD: .4 }, "SCALE_SELF", true),
  scaleQuestion(24, "Мне не жалко повторно объяснить человеку тему другими словами", { CO: 1, CR: .3 }, "SCALE_SELF"),
  scenarioQuestion(25, "У криптопротокола обнаружили подозрительный вывод средств. Что вам интереснее сделать?", [
    ["Проверить код и найти возможную уязвимость", { SECURITY: 1, DEV: .4, PR: .4 }],
    ["Проследить движение средств по адресам", { DATA: 1, MARKET_RESEARCH: .3, AN: .4 }],
    ["Подготовить понятное предупреждение пользователям", { COMMUNITY: 1, CO: .4 }],
    ["Организовать работу команд и план реакции", { PRODUCT: .8, OPS: .5, IN: .4 }],
  ]),
  scenarioQuestion(26, "Команда готовит новый криптосервис. За какую часть вы бы охотнее отвечали?", [
    ["Архитектура и техническая реализация", { DEV: 1, OPS: .3 }],
    ["Пользовательская проблема и план развития", { PRODUCT: 1, CR: .3 }],
    ["Правила, ограничения и проверка процессов", { COMPLIANCE: 1, PR: .3 }],
    ["Партнёры и совместный запуск", { PARTNERSHIPS: 1, IN: .4 }],
  ]),
  scenarioQuestion(27, "Рынок резко упал после тревожной новости. Какой подход вам ближе?", [
    ["Сверить новость, исходный план и допустимый риск до любого действия", { INVESTOR: 1, MARKET_RESEARCH: .4, SC: .5 }],
    ["Сразу купить больше: падение само по себе означает выгодную цену", { SC: -.8 }],
    ["Немедленно закрыть всё, чтобы прекратить тревогу", { SC: -.8, AD: -.3 }],
    ["Ничего не проверять и просто не открывать приложение", { ST: -.3, AN: -.3 }],
  ]),
  scenarioQuestion(28, "Стейблкоин временно потерял привязку к доллару. Что вам интереснее исследовать?", [
    ["Транзакции, ликвидность и движение крупных адресов", { DATA: .8, MARKET_RESEARCH: .6 }],
    ["Резервы, правила погашения и юридические риски", { COMPLIANCE: .8, MARKET_RESEARCH: .5 }],
    ["Возможные сценарии цены и последствия для портфеля", { MARKET_RESEARCH: .8, INVESTOR: .5 }],
    ["Как простыми словами объяснить ситуацию новичкам", { COMMUNITY: 1, CR: .3 }],
  ]),
  scenarioQuestion(29, "Какую тему вы бы выбрали для свободного учебного вечера?", [
    ["Язык программирования и работа смарт-контракта", { DEV: 1 }],
    ["SQL, графики и анализ блокчейн-данных", { DATA: 1 }],
    ["Правила для бирж и проверка подозрительных операций", { COMPLIANCE: 1 }],
    ["Организация встречи и ответы участникам сообщества", { COMMUNITY: .8, PARTNERSHIPS: .4 }],
  ]),
  scenarioQuestion(30, "В сервисе периодически зависают переводы. Какой вклад вам ближе?", [
    ["Автоматизировать диагностику и исправление", { OPS: 1, DEV: .4 }],
    ["Найти повторяющуюся причину в данных", { DATA: .8, AN: .4 }],
    ["Обновить инструкции и порядок реакции команды", { OPS: .6, COMPLIANCE: .3, ST: .4 }],
    ["Объяснить пользователям статус и дальнейшие шаги", { COMMUNITY: .8, PRODUCT: .3 }],
  ]),
  scenarioQuestion(31, "Вы можете помочь открытому криптопроекту. Какую задачу выберете?", [
    ["Написать небольшую функцию контракта", { DEV: 1 }],
    ["Попробовать сломать тестовую версию и описать уязвимость", { SECURITY: 1 }],
    ["Проверить экономику токена и ключевые допущения", { MARKET_RESEARCH: 1 }],
    ["Сделать понятный материал для новых пользователей", { COMMUNITY: 1 }],
  ]),
  scenarioQuestion(32, "У стартапа есть технология, но непонятно, кому и зачем она нужна. С чего вам интереснее начать?", [
    ["Провести разговоры с пользователями и определить проблему", { PRODUCT: 1, CO: .3 }],
    ["Проверить безопасность и ограничения технологии", { SECURITY: .8, DEV: .4 }],
    ["Найти проекты, с которыми можно объединить решение", { PARTNERSHIPS: 1 }],
    ["Проверить, можно ли запускать продукт в выбранных странах", { COMPLIANCE: 1 }],
  ]),
  scenarioQuestion(33, "Вам дали большой набор транзакций без готового вопроса. Что вы сделаете первым?", [
    ["Проверю качество данных и поищу необычные закономерности", { DATA: 1, AN: .4 }],
    ["Построю несколько рыночных гипотез для проверки", { MARKET_RESEARCH: 1 }],
    ["Уточню, какое пользовательское решение должен поддержать анализ", { PRODUCT: .8, CO: .2 }],
    ["Настрою регулярную загрузку и контроль сбоев", { OPS: 1, ST: .3 }],
  ]),
  scenarioQuestion(34, "Клиент спрашивает, какой криптоактив «точно вырастет». Какой ответ вам ближе подготовить?", [
    ["Объяснить, почему гарантии невозможны, и показать основные риски", { INVESTOR: .6, COMMUNITY: .5, SC: .4 }],
    ["Собрать сценарии с допущениями и данными", { MARKET_RESEARCH: 1 }],
    ["Проверить ограничения рекламы и корректность формулировок", { COMPLIANCE: 1 }],
    ["Пообещать результат, чтобы не потерять клиента", { PR: -.7, SC: -.5, CO: -.2 }],
  ]),
  scenarioQuestion(35, "Вы помогаете организовать городской фестиваль. Какую роль выберете?", [
    ["Настроить технику и решить проблемы на площадке", { R: .8, OPS: .5 }],
    ["Вести бюджет, списки и расписание", { C: .8, ST: .5 }],
    ["Придумать программу и оформление", { A: .8, CR: .5 }],
    ["Найти партнёров и договориться об участии", { E: .8, PARTNERSHIPS: .5 }],
  ]),
  scenarioQuestion(36, "Домашнее устройство перестало работать. Что вы обычно делаете?", [
    ["Последовательно проверяю возможные причины", { AN: .6, R: .5, PR: .3 }],
    ["Ищу инструкцию и точно повторяю шаги", { ST: .6, C: .4 }],
    ["Прошу знающего человека и стараюсь понять объяснение", { CO: .4, S: .3 }],
    ["Пробую разные действия без плана, пока что-то не поможет", { AD: .2, PR: -.4 }],
  ]),
  scenarioQuestion(37, "Компания друзей осваивает сложную настольную игру. Что вам ближе?", [
    ["Внимательно разобраться в правилах и спорных случаях", { C: .5, PR: .5 }],
    ["Сразу сыграть пробную партию и учиться по ходу", { AD: .6, R: .3 }],
    ["Объяснить правила остальным на простых примерах", { S: .6, CO: .5 }],
    ["Изучить вероятности и построить стратегию", { I: .7, AN: .5 }],
  ]),
  scenarioQuestion(38, "В команде возник спор о следующем шаге. Что вы скорее сделаете?", [
    ["Соберу факты и критерии, по которым можно сравнить варианты", { AN: .6, PRODUCT: .3 }],
    ["Поговорю с участниками и найду общую точку", { CO: .7, S: .4 }],
    ["Возьму ответственность и предложу конкретное решение", { IN: .7, E: .4 }],
    ["Зафиксирую варианты, риски и порядок принятия решения", { ST: .6, PR: .3 }],
  ]),
  scenarioQuestion(39, "У вас есть неделя на свободный проект. Что звучит привлекательнее?", [
    ["Собрать работающий технический прототип", { R: .5, DEV: .6 }],
    ["Исследовать вопрос и выпустить разбор с данными", { I: .6, MARKET_RESEARCH: .6 }],
    ["Организовать полезное событие для людей", { S: .6, COMMUNITY: .5 }],
    ["Придумать концепцию и красиво её представить", { A: .6, CR: .5 }],
  ]),
  scenarioQuestion(40, "Вы участвуете в конкурсе с неопределённым результатом. Как распределите ограниченные ресурсы?", [
    ["Сначала проведу небольшой эксперимент и продолжу при понятном результате", { AN: .5, SC: .7, AD: .3 }],
    ["Составлю план, лимиты потерь и несколько запасных вариантов", { ST: .5, SC: .7, PR: .3 }],
    ["Поставлю всё на самый смелый вариант: иначе победы не будет", { IN: .3, SC: -.8 }],
    ["Откажусь участвовать, пока результат нельзя предсказать точно", { AD: -.5 }],
  ]),
];

const attempts = new Map<string, CareerAttempt>();
let careerRepository: CareerRepository | null = null;

export async function initializeCareerState(repository: CareerRepository) {
  careerRepository = repository;
  attempts.clear();
  for (const attempt of await repository.loadAll()) attempts.set(attempt.id, attempt);
}

const dimensionMeta: Record<InterestAxis | StyleAxis, { label: string; description: string }> = {
  R: { label: "Практические системы", description: "Настраивать, запускать и поддерживать работающие решения" },
  I: { label: "Исследование", description: "Искать причины, проверять гипотезы и разбираться в сложном" },
  A: { label: "Творческая подача", description: "Создавать новые формы и понятно выражать идеи" },
  S: { label: "Помощь людям", description: "Обучать, поддерживать и учитывать потребности других" },
  E: { label: "Влияние", description: "Предлагать направление, договариваться и брать ответственность" },
  C: { label: "Порядок", description: "Работать точно, последовательно и по понятному процессу" },
  AN: { label: "Анализ и поиск причин", description: "Глубоко разбираться и не останавливаться на первом объяснении" },
  PR: { label: "Точность и безопасность", description: "Замечать детали, ошибки и возможные последствия" },
  ST: { label: "Порядок и планирование", description: "Доводить задачи до конца и поддерживать структуру" },
  AD: { label: "Работа в неопределённости", description: "Перестраиваться и действовать при неполной информации" },
  SC: { label: "Самоконтроль", description: "Не принимать импульсивные решения под давлением" },
  CO: { label: "Общение и объяснение", description: "Слушать людей и переводить сложное на понятный язык" },
  IN: { label: "Инициатива", description: "Предлагать первый шаг и влиять на движение команды" },
  CR: { label: "Новые решения", description: "Искать нестандартные подходы и способы подачи" },
};

const reasonTemplates: Record<InterestAxis | StyleAxis, string> = {
  R: "Вам интереснее иметь дело с работающими системами и практическим результатом.",
  I: "Вы часто выбираете исследование причин и проверку гипотез.",
  A: "Вам близко создание новых форм и понятной подачи сложных идей.",
  S: "В ответах заметен интерес к помощи, обучению и взаимодействию с людьми.",
  E: "Вам комфортно предлагать направление, договариваться и влиять на решение.",
  C: "Вам важны порядок, точность и понятный процесс работы.",
  AN: "Вы предпочитаете сначала разобраться в причинах, а уже затем делать вывод.",
  PR: "Вы склонны перепроверять важные детали и учитывать возможные последствия.",
  ST: "Вы цените структуру и готовы доводить задачу до завершения.",
  AD: "Вы можете перестраиваться, когда план меняется или данных пока недостаточно.",
  SC: "Вы чаще выбираете проверку фактов и лимитов, чем импульсивное действие.",
  CO: "Вам близко объяснять сложное и искать взаимопонимание с людьми.",
  IN: "Когда нет готового плана, вы готовы предложить первый шаг.",
  CR: "Вы ищете новые способы представить идею или решить задачу.",
};

function publicQuestion(question: Question) {
  return {
    id: question.id,
    order: question.order,
    block: question.block,
    blockTitle: question.blockTitle,
    type: question.type,
    text: question.text,
    options: question.options.map(({ id, text }) => ({ id, text })),
  };
}

function publicRole(role: CareerRole) {
  return {
    id: role.id,
    title: role.title,
    shortDescription: role.shortDescription,
    dailyTasks: role.dailyTasks,
    challenge: role.challenge,
    entrySkills: role.entrySkills,
    learningPath: role.learningPath,
    practiceTask: role.practiceTask,
    accent: role.accent,
    disclaimer: role.disclaimer ?? null,
  };
}

function publicAttempt(attempt: CareerAttempt) {
  return {
    id: attempt.id,
    status: attempt.status,
    startedAt: attempt.startedAt,
    completedAt: attempt.completedAt,
    answeredCount: Object.keys(attempt.answers).length,
    totalQuestions: questions.length,
    answers: attempt.answers,
    questions: questions.map(publicQuestion),
    resultReady: Boolean(attempt.result),
  };
}

function selectedOption(attempt: CareerAttempt, question: Question) {
  const optionId = attempt.answers[question.id];
  return optionId ? question.options.find((option) => option.id === optionId) : undefined;
}

function dimensionScores(attempt: CareerAttempt) {
  const keys: Array<InterestAxis | StyleAxis> = [...interestAxes, ...styleAxes];
  return Object.fromEntries(keys.map((key) => {
    let numerator = 0;
    let denominator = 0;
    for (const question of questions) {
      const option = selectedOption(attempt, question);
      if (!option) continue;
      if (question.type === "SINGLE_CHOICE") {
        const maxWeight = Math.max(0, ...question.options.map((item) => Math.abs(item.vector[key] ?? 0)));
        if (maxWeight > 0) {
          numerator += option.vector[key] ?? 0;
          denominator += maxWeight;
        }
      } else {
        const weight = question.vector[key] ?? 0;
        if (weight !== 0 && option.score !== null) {
          const raw = option.score / 4;
          numerator += (question.reverse ? 1 - raw : raw) * Math.abs(weight);
          denominator += Math.abs(weight);
        }
      }
    }
    return [key, denominator ? Math.max(0, Math.min(1, numerator / denominator)) : .5];
  })) as Record<InterestAxis | StyleAxis, number>;
}

function scenarioAffinity(attempt: CareerAttempt, roleKey: RoleKey) {
  let numerator = 0;
  let denominator = 0;
  for (const question of questions.filter((item) => item.type === "SINGLE_CHOICE")) {
    const option = selectedOption(attempt, question);
    const max = Math.max(0, ...question.options.map((item) => Math.max(0, item.vector[roleKey] ?? 0)));
    denominator += max;
    numerator += option?.vector[roleKey] ?? 0;
  }
  return denominator ? Math.max(0, Math.min(1, numerator / denominator)) : 0;
}

function closeness<T extends InterestAxis | StyleAxis>(scores: Record<InterestAxis | StyleAxis, number>, targets: Partial<Record<T, number>>) {
  const entries = Object.entries(targets) as Array<[T, number]>;
  const weightSum = entries.reduce((sum, [, target]) => sum + target, 0);
  if (!weightSum) return .5;
  const distance = entries.reduce((sum, [key, target]) => sum + target * Math.abs(scores[key] - target), 0);
  return Math.max(0, Math.min(1, 1 - distance / weightSum));
}

function roleSimilarity(first: CareerRole, second: CareerRole) {
  const firstKeys = new Set([...Object.keys(first.interestTargets), ...Object.keys(first.styleTargets)]);
  const secondKeys = new Set([...Object.keys(second.interestTargets), ...Object.keys(second.styleTargets)]);
  const shared = [...firstKeys].filter((key) => secondKeys.has(key)).length;
  const union = new Set([...firstKeys, ...secondKeys]).size;
  const vectorSimilarity = union ? shared / union : 0;
  return Math.min(1, vectorSimilarity + (first.group === second.group ? .2 : 0));
}

function scoreRoles(attempt: CareerAttempt, scores: Record<InterestAxis | StyleAxis, number>) {
  return roles.map((role) => {
    const interestCloseness = closeness(scores, role.interestTargets);
    const styleCloseness = closeness(scores, role.styleTargets);
    const affinity = scenarioAffinity(attempt, role.key);
    let raw = 100 * (.4 * interestCloseness + .35 * styleCloseness + .25 * affinity);
    for (const [key, threshold] of Object.entries(role.criticalThresholds) as Array<[StyleAxis, number]>) {
      raw -= Math.max(0, threshold - scores[key]) * 18;
    }
    return { role, score: Math.round(Math.max(0, Math.min(100, raw))) };
  }).sort((a, b) => b.score - a.score);
}

function selectDiverseTopRoles(scored: ReturnType<typeof scoreRoles>) {
  const selected = [scored[0]].filter((item): item is NonNullable<typeof item> => Boolean(item));
  const remaining = scored.slice(1);
  while (selected.length < 3 && remaining.length) {
    const bestRaw = remaining[0]?.score ?? 0;
    const eligible = remaining.filter((item) => bestRaw - item.score <= 7);
    const pool = eligible.length ? eligible : remaining.slice(0, 1);
    const chosen = [...pool].sort((a, b) => {
      const aPenalty = Math.max(...selected.map((item) => roleSimilarity(a.role, item.role))) * 12;
      const bPenalty = Math.max(...selected.map((item) => roleSimilarity(b.role, item.role))) * 12;
      return (b.score - bPenalty) - (a.score - aPenalty);
    })[0];
    if (!chosen) break;
    selected.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }
  return selected;
}

function roleReasons(attempt: CareerAttempt, role: CareerRole, scores: Record<InterestAxis | StyleAxis, number>) {
  const targetEntries = [
    ...(Object.entries(role.interestTargets) as Array<[InterestAxis, number]>),
    ...(Object.entries(role.styleTargets) as Array<[StyleAxis, number]>),
  ];
  const reasons = targetEntries
    .map(([key, weight]) => ({ key, contribution: scores[key] * weight }))
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map(({ key }) => reasonTemplates[key]);

  const evidence = questions
    .filter((question) => question.type === "SINGLE_CHOICE")
    .map((question) => selectedOption(attempt, question))
    .filter((option): option is QuestionOption => Boolean(option && (option.vector[role.key] ?? 0) > 0))
    .sort((a, b) => (b.vector[role.key] ?? 0) - (a.vector[role.key] ?? 0))[0];
  if (evidence) reasons.push(`В одной из практических ситуаций вам был ближе вариант: «${evidence.text.toLocaleLowerCase("ru-RU")}».`);
  reasons.push(`Ваши ответы совпали с задачами этого направления на ${Math.round(scenarioAffinity(attempt, role.key) * 100)}% по сценарной части.`);
  return reasons.slice(0, 4);
}

function qualityFor(attempt: CareerAttempt, scored: ReturnType<typeof scoreRoles>) {
  const scaleAnswers = questions.slice(0, 24).map((question) => selectedOption(attempt, question)?.score).filter((score): score is number => score !== null && score !== undefined);
  const mostCommon = Math.max(0, ...[0, 1, 2, 3, 4].map((score) => scaleAnswers.filter((value) => value === score).length));
  const durationSeconds = Math.max(1, (Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
  const spread = (scored[0]?.score ?? 0) - (scored[3]?.score ?? 0);
  if (mostCommon >= 20 || durationSeconds < 90) {
    return { level: "MIXED" as const, label: "Ответы получились неоднозначными", text: "Лучше проверить направления через короткие практические задания и при желании пройти компас ещё раз позже." };
  }
  if (spread < 7) {
    return { level: "CLOSE" as const, label: "Несколько близких направлений", text: "У вас нет одного жёсткого профиля — это нормально. Сравните задачи трёх направлений на практике." };
  }
  return { level: "STABLE" as const, label: "Устойчивый профиль", text: "Ответы достаточно последовательно выделяют несколько сильных рабочих предпочтений." };
}

function buildResult(attempt: CareerAttempt): CareerResult {
  const scores = dimensionScores(attempt);
  const scored = scoreRoles(attempt, scores);
  const top = selectDiverseTopRoles(scored);
  const strongestStyles = styleAxes
    .map((key) => ({ key, value: scores[key] }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const headline = `Ваше сильное сочетание: ${strongestStyles.map(({ key }) => dimensionMeta[key].label.toLocaleLowerCase("ru-RU")).join(", ")}`;
  const result: CareerResult = {
    attemptId: attempt.id,
    completedAt: new Date().toISOString(),
    headline,
    summary: "По текущим ответам вам ближе несколько типов задач. Это ориентир для практической проверки, а не окончательный выбор профессии.",
    quality: qualityFor(attempt, scored),
    topRoles: top.map(({ role, score }) => ({ role: publicRole(role), fitPercent: score, reasons: roleReasons(attempt, role, scores), challenge: role.challenge })),
    allRoleScores: scored.map(({ role, score }) => ({ roleId: role.id, title: role.title, fitPercent: score })),
    dimensions: [...interestAxes, ...styleAxes].map((id) => ({ id, label: dimensionMeta[id].label, value: Math.round(scores[id] * 100), description: dimensionMeta[id].description })),
    disclaimer: "Процент показывает совпадение ответов с моделью направления, а не вероятность успеха, трудоустройства или дохода.",
  };
  return result;
}

export function getCareerOverview(userId: string) {
  const active = [...attempts.values()].filter((item) => item.userId === userId && item.status === "IN_PROGRESS").sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
  const latest = [...attempts.values()].filter((item) => item.userId === userId && item.result).sort((a, b) => (b.completedAt ?? "").localeCompare(a.completedAt ?? ""))[0];
  return {
    title: "Карьерный компас",
    description: "40 вопросов помогут сравнить ваши интересы и рабочий стиль с десятью направлениями в криптоиндустрии.",
    estimatedMinutes: 10,
    questionCount: questions.length,
    roleCount: roles.length,
    blocks: blockTitles.map((title, index) => ({ number: index + 1, title, questionCount: 8 })),
    roles: roles.map(publicRole),
    activeAttempt: active ? { id: active.id, answeredCount: Object.keys(active.answers).length, totalQuestions: questions.length } : null,
    latestResult: latest?.result ? {
      attemptId: latest.id,
      completedAt: latest.result.completedAt,
      headline: latest.result.headline,
      topRoles: latest.result.topRoles.map((item) => ({ role: item.role, fitPercent: item.fitPercent })),
    } : null,
  };
}

export async function createCareerAttempt(userId: string, restart = false) {
  if (!restart) {
    const active = [...attempts.values()].find((item) => item.userId === userId && item.status === "IN_PROGRESS");
    if (active) return publicAttempt(active);
  }
  const attempt: CareerAttempt = {
    id: randomUUID(), userId, questionnaireVersion: QUESTIONNAIRE_VERSION, algorithmVersion: ALGORITHM_VERSION,
    status: "IN_PROGRESS", startedAt: new Date().toISOString(), completedAt: null, answers: {}, result: null,
  };
  attempts.set(attempt.id, attempt);
  await careerRepository?.save(attempt);
  return publicAttempt(attempt);
}

export function getCareerAttempt(attemptId: string, userId: string) {
  const attempt = attempts.get(attemptId);
  return attempt?.userId === userId ? publicAttempt(attempt) : null;
}

export async function saveCareerAnswer(attemptId: string, userId: string, questionId: string, optionId: string) {
  const attempt = attempts.get(attemptId);
  if (!attempt || attempt.userId !== userId || attempt.status !== "IN_PROGRESS") return null;
  const question = questions.find((item) => item.id === questionId);
  if (!question?.options.some((item) => item.id === optionId)) return null;
  attempt.answers[questionId] = optionId;
  await careerRepository?.save(attempt);
  return publicAttempt(attempt);
}

export async function completeCareerAttempt(attemptId: string, userId: string) {
  const attempt = attempts.get(attemptId);
  if (!attempt || attempt.userId !== userId) return { error: "NOT_FOUND" as const };
  if (attempt.result) return { data: attempt.result };
  if (questions.some((question) => !attempt.answers[question.id])) return { error: "INCOMPLETE" as const };
  attempt.status = "COMPLETED";
  attempt.completedAt = new Date().toISOString();
  attempt.result = buildResult(attempt);
  await careerRepository?.save(attempt);
  return { data: attempt.result };
}

export function getCareerResult(attemptId: string, userId: string) {
  const attempt = attempts.get(attemptId);
  return attempt?.userId === userId ? attempt.result : null;
}

export function getCareerRole(roleId: string) {
  const role = roles.find((item) => item.id === roleId);
  return role ? publicRole(role) : null;
}

export const careerCatalogStats = { questions: questions.length, roles: roles.length, roleKeys: roleKeys.length };
