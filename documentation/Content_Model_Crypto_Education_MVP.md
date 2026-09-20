# Content Model — Crypto Education MVP

## 1. Назначение

Документ определяет единые форматы образовательного и редакционного контента. Контент отделяется от UI и не генерируется LLM в MVP.

Общие поля для публикуемых сущностей: `id`, `status`, `updatedAt`; при необходимости `order`. Статусы: `DRAFT`, `PUBLISHED`, `ARCHIVED`.

## 2. Course — направление

Используется для: Криптовалюты, Blockchain, Финансовые основы, Россия и право.

| Поле | Тип | Обяз. | Описание |
|---|---|---:|---|
| id | string | Да | ID |
| slug | string | Да | Системный ключ |
| title | string | Да | Название |
| shortDescription | string | Да | Короткое описание |
| coverAsset | string | Нет | Иллюстрация |
| order | integer | Да | Порядок |
| status | enum | Да | Статус |

## 3. Lesson — урок

| Поле | Тип | Обяз. |
|---|---|---:|
| id | string | Да |
| courseId | string | Да |
| title | string | Да |
| shortDescription | string | Да |
| durationMinutes | integer | Да |
| order | integer | Да |
| heroAsset | string | Нет |
| sections | LessonSection[] | Да |
| pages | LessonPage[] | Да |
| pageCount | integer | Да |
| quizId | string | Да |
| robotTip | string | Нет |
| status | enum | Да |

### LessonSection

Типы: `TEXT`, `EXAMPLE`, `KEY_TAKEAWAY`, `RISK`, `IMAGE`, `BULLETS`.

```json
{
  "type": "KEY_TAKEAWAY",
  "title": "Главное запомнить",
  "body": "..."
}
```

### LessonPage

Страница имеет `kind: CONTENT` с одним смысловым блоком или `kind: CHECKPOINT` с вопросом, вариантами, правильным ответом и заранее подготовленным объяснением. Правильный ответ промежуточной проверки доступен клиенту, потому что это обучающий разбор, а не итоговая оценка.

## 4. Quiz — итоговый тест

### Quiz
- id
- lessonId
- title
- questions: `QuizQuestion[]` (3–5)

### QuizQuestion
- id
- text
- type: `SINGLE_CHOICE` / `MULTIPLE_CHOICE`
- options: `QuizOption[]`
- explanation
- order

### QuizOption
- id
- text
- isCorrect

`isCorrect` итогового теста не передаётся клиенту до submit; результат и факт освоения рассчитывает backend.

## 5. News — новость / образовательный разбор

| Поле | Тип | Обяз. |
|---|---|---:|
| id | string | Да |
| title | string | Да |
| preview | string | Да |
| category | MARKET / LAW / SECURITY / TECHNOLOGY | Да |
| publishedAt | datetime | Да |
| whatHappened | string | Да |
| whyImportant | string | Да |
| analysis | string | Да |
| takeaway | string | Да |
| sourceName | string | Да |
| sourceUrl | string | Да |
| disclaimer | string | Да |
| status | enum | Да |

## 6. SecurityCase — учебный кейс

| Поле | Тип | Обяз. |
|---|---|---:|
| id | string | Да |
| title | string | Да |
| shortDescription | string | Да |
| scenarioText | string | Да |
| context | string | Нет |
| options | SecurityCaseOption[] | Да |
| redFlags | string[] | Да |
| takeaway | string | Да |
| threatIds | string[] | Нет |
| order | integer | Да |
| status | enum | Да |

### SecurityCaseOption
- id
- text
- safetyLevel: `SAFE` / `RISKY`
- feedback
- consequences (optional)

## 7. ThreatCard — карточка угрозы

**P2.** Поля:
- id, title, slug;
- definition;
- howItWorks;
- signs[];
- example;
- protection[];
- neverDo[];
- status.

## 8. Scenario — Market Replay

| Поле | Тип | Обяз. |
|---|---|---:|
| id | string | Да |
| title | string | Да |
| shortDescription | string | Да |
| startDate | date | Да |
| endDate | date | Да |
| estimatedMinutes | integer | Да |
| difficulty | BEGINNER / INTERMEDIATE / ADVANCED | Да |
| startingBalanceRub | decimal | Да |
| assetSymbols | string[] | Да |
| educationalFocus | string[] | Да |
| benchmark | object | Да |
| eventCount | integer | Да |
| speedProfile | object | Да |
| analysisRules | object | Да |
| status | enum | Да |

## 9. ScenarioEvent — историческое событие

Поля:
- id;
- scenarioId;
- eventAt;
- title;
- description;
- context (optional);
- category: `MARKET`, `WORLD`, `REGULATION`, `TECHNOLOGY`, `SECURITY`, `COMPANY`;
- affectedAssets[];
- sourceName;
- sourceUrl;
- learningTopic (optional);
- order.

Событие не должно содержать сведения, появившиеся позже `eventAt`.

В публичное состояние активной симуляции передаются только события с `eventAt <= scenarioAt`. Сделка сохраняет `triggerEventId` последнего уже открывшегося события, чтобы итоговый разбор мог связать решение с доступной на тот момент информацией.

## 10. HistoricalPrice

Поля:
- scenarioId;
- assetSymbol;
- timestamp;
- priceRub;
- source.

Временная сетка должна быть достаточной для воспроизведения выбранной скорости replay.

## 11. Achievement

**P2.** Поля:
- id;
- code;
- title;
- description;
- icon;
- triggerType;
- triggerValue.

## 12. Правила редакционного стиля

Материалы должны:
- использовать простой язык;
- расшифровывать термин при первом использовании;
- не обещать доходность;
- не давать индивидуальных инвестиционных рекомендаций;
- отделять факт от интерпретации;
- для правовых/новостных материалов указывать источник и дату;
- не использовать реальные seed phrase/private key в примерах.

## 13. Минимальное наполнение хакатона

### Учиться
- 4 направления;
- 5 полноценных уроков в каждом, от простых основ к более сложным темам;
- мини-тест к каждому готовому уроку.

### Market Replay
- минимум 1 полный P0-сценарий;
- минимум 3 события;
- 2–3 актива;
- historical prices;
- benchmark;
- deterministic analysis rules.

### Безопасность
- минимум 3 кейса;
- Threat base — P2.

### Крипторынок
- 3–5 активов;
- 3–5 новостей с источниками.
