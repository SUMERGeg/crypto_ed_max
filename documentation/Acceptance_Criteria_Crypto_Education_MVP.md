# Acceptance Criteria — Crypto Education MVP

## AC-AUTH — MAX identification

### AC-AUTH-01 — Первый запуск
**Given** пользователь впервые открывает mini-app из MAX  
**When** backend успешно валидирует launch-data  
**Then** создаётся внутренний профиль  
**And** открывается Главная  
**And** форма регистрации не отображается.

### AC-AUTH-02 — Повторный запуск
**Given** профиль MAX ID существует  
**When** пользователь запускает mini-app  
**Then** загружается существующий профиль и progress.

## AC-LEARN — Уроки и прогресс

### AC-LEARN-01
**Given** пользователь открыл «Учиться»  
**Then** видны 4 направления  
**And** любое можно открыть независимо от progress.

### AC-LEARN-02
**Given** пользователь открыл урок  
**When** ответил на все вопросы итогового теста, набрал не менее 67% и открыл результат  
**Then** LessonProgress = COMPLETED  
**And** progress направления пересчитан.

### AC-LEARN-03
**Given** пользователь завершил итоговый тест с результатом ниже 67%  
**Then** попытка сохранена  
**And** урок остаётся OPENED  
**And** пользователь видит разбор ошибок и действие «Повторить материал».

### AC-LEARN-05
**Given** пользователь проходит урок  
**Then** материал разделён на 6 смысловых страниц  
**And** между ними есть 2 обязательные проверки с мгновенным объяснением.

### AC-LEARN-04
**Given** тест уже пройден  
**When** пользователь проходит его повторно  
**Then** создаётся новая QuizAttempt  
**And** progress не откатывается.

## AC-QUIZ

### AC-QUIZ-01
**Given** тест содержит N вопросов  
**When** пользователь завершает тест  
**Then** score = correct / N × 100%.

### AC-QUIZ-02
**Given** есть несколько попыток  
**Then** профиль показывает максимальный score  
**And** система хранит дату последней попытки.

## AC-SIM — Market Replay

### AC-SIM-01 — Старт
**Given** пользователь выбрал опубликованный сценарий  
**When** нажимает «Начать»  
**Then** создаётся SimulationSession  
**And** cash = starting balance  
**And** portfolio пуст.

### AC-SIM-02 — Нет future data
**Given** scenario time = T  
**When** клиент получает state  
**Then** нет HistoricalPrice с timestamp > T  
**And** нет ScenarioEvent с eventAt > T.

### AC-SIM-03 — Event
**Given** scenario time достиг eventAt  
**Then** событие доступно  
**And** раньше eventAt оно недоступно.

### AC-SIM-04 — Pause
**Given** replay активен  
**When** пользователь нажимает Pause  
**Then** историческое время останавливается  
**And** портфель доступен для просмотра/операции.

## AC-TRADE — BUY/SELL

### AC-TRADE-01 — Успешный BUY
**Given** cash = 20 000 ₽  
**And** BUY amount = 10 000 ₽  
**When** операция подтверждена  
**Then** transaction сохранена  
**And** cash уменьшается на 10 000 ₽  
**And** position увеличивается.

### AC-TRADE-02 — Недостаточно cash
**Given** cash = 5 000 ₽  
**When** BUY amount = 10 000 ₽  
**Then** операция не создаётся  
**And** баланс не меняется.

### AC-TRADE-03 — SELL
**Given** position = 0.5  
**When** SELL quantity = 0.2  
**Then** position = 0.3  
**And** cash увеличен  
**And** transaction сохранена.

### AC-TRADE-04 — Excess SELL
**Given** position = 0.5  
**When** SELL quantity = 0.6  
**Then** операция отклонена  
**And** portfolio не меняется.

### AC-TRADE-05 — Historical price
**Given** текущая historical price = P  
**When** выполняется сделка  
**Then** transaction.price = P.

## AC-RESULT — Итоги

### AC-RESULT-01 — Return
**Given** start = 100 000  
**And** final = 120 000  
**Then** return = 20%.

### AC-RESULT-02 — Benchmark
**Given** scenario имеет benchmarkAsset  
**When** сценарий завершён  
**Then** рассчитан buy-and-hold benchmark  
**And** показана разница с пользователем.

### AC-RESULT-03 — Educational analysis
**Given** scenario завершён  
**Then** при срабатывании rule выводится deterministic comment  
**And** нет формулировки конкретной сделки как универсально правильной.

### AC-RESULT-04
**When** результат рассчитан  
**Then** session = COMPLETED  
**And** результат виден в профиле.

## AC-SEC — Безопасность

### AC-SEC-01
**Given** пользователь открыл кейс  
**When** выбрал действие  
**Then** показываются feedback, red flags и takeaway.

### AC-SEC-02
**When** разбор просмотрен  
**Then** кейс считается завершённым.

### AC-SEC-03
**Then** ни один кейс не запрашивает реальные seed phrase/private key/password.

## AC-MARKET

### AC-MARKET-01
**Given** provider доступен  
**When** открывается market  
**Then** показываются assets, prices и source timestamp.

### AC-MARKET-02
**Given** provider недоступен  
**And** cache есть  
**Then** возвращается cache  
**And** `isStale=true`.

### AC-MARKET-03
**Given** provider недоступен и cache нет  
**Then** отображается «Данные временно недоступны».

### AC-MARKET-04
**Then** market screen не содержит реальной BUY/SELL CTA.

## AC-NEWS

### AC-NEWS-01
**Given** news опубликована  
**When** пользователь её открывает  
**Then** видны смысловые блоки, дата, source и disclaimer.

## AC-PROFILE

### AC-PROFILE-01
**Given** опубликовано 20 уроков и завершено 5  
**Then** overall progress = 25%.

### AC-PROFILE-02
**Given** завершён scenario  
**Then** profile отображает завершение и результат.

### AC-PROFILE-03
**Given** сохранён lastOpenedLesson  
**When** пользователь выбирает продолжение  
**Then** открывается этот Lesson.

## Definition of Accepted MVP

Build принимается, если:
1. работает бесшовный вход через MAX;
2. работает один полный learning flow;
3. работает один Market Replay end-to-end;
4. BUY/SELL валидируются backend;
5. future data не раскрываются;
6. return и benchmark корректны;
7. progress сохраняется;
8. минимум один security flow работает;
9. market/news имеют fallback/source;
10. demo flow проходит без ручного изменения БД.
