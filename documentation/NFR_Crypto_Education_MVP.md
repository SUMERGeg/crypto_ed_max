# Non-Functional Requirements — Crypto Education MVP

## 1. Performance

### NFR-PERF-001
Основные UI-экраны после получения данных должны становиться интерактивными без заметной длительной блокировки. Целевой ориентир — до 2 секунд при нормальном соединении.

### NFR-PERF-002
Для обычных backend API-запросов целевой p95 без учёта внешнего market provider — до 500 мс в хакатонной нагрузке.

### NFR-PERF-003
Market Replay не должен требовать backend-запроса на каждый animation frame. Frontend отвечает за визуальное продвижение времени, backend — за доверенное состояние и операции.

## 2. Mobile-first

### NFR-UX-001
Интерфейс проектируется прежде всего для mobile viewport mini-app.

### NFR-UX-002
Основные сценарии выполняются без обязательной горизонтальной прокрутки.

### NFR-UX-003
Графики корректно масштабируются под мобильный экран.

### NFR-UX-004
Необходимо проверить целевые WebView/браузерные окружения MAX на мобильных платформах.

## 3. Security

### NFR-SEC-001
Production/staging трафик — HTTPS.

### NFR-SEC-002
MAX initData валидируется backend до доверия к user ID.

### NFR-SEC-003
Frontend не может самостоятельно менять progress, quiz score, cash balance, portfolio и completed simulation result.

### NFR-SEC-004
Все изменения пользовательского состояния проходят серверную валидацию.

### NFR-SEC-005
Секреты external APIs находятся только на backend.

### NFR-SEC-006
Не логировать секреты, raw auth payload после отладки и потенциальные чувствительные пользовательские данные.

## 4. Privacy / Data Minimization

### NFR-PRIV-001
Хранить только данные, необходимые для идентификации, progress, результатов и simulation sessions.

### NFR-PRIV-002
Не запрашивать телефон, email, паспортные или банковские данные.

### NFR-PRIV-003
Не запрашивать и не хранить реальные wallet secrets, seed phrase и private key.

## 5. Financial Safety

### NFR-FIN-001
Продукт не выполняет реальные финансовые операции.

### NFR-FIN-002
Симулятор явно маркируется как виртуальный.

### NFR-FIN-003
Новости, benchmark и educational analysis не подаются как инвестиционные рекомендации.

### NFR-FIN-004
Крипторынок не содержит перехода к реальной торговле в MVP.

## 6. Reliability / External API

### NFR-REL-001
Недоступность market provider не должна ломать обучение, Market Replay, безопасность и профиль.

### NFR-REL-002
Historical Market Replay использует заранее подготовленный dataset и не зависит от live API.

### NFR-REL-003
Current market-data кешируются.

### NFR-REL-004
При отсутствии актуальных и кешированных данных показывается controlled fallback state.

## 7. Data Integrity

### NFR-DATA-001
BUY/SELL и завершение simulation должны атомарно изменять состояние session.

### NFR-DATA-002
Повторный HTTP-запрос не должен создавать случайную дублирующую сделку. Для trade рекомендуется Idempotency-Key.

### NFR-DATA-003
Historical dataset должен иметь version, чтобы replay оставался воспроизводимым.

## 8. Accessibility / Readability

### NFR-A11Y-001
Ключевая информация не кодируется только цветом.

### NFR-A11Y-002
Образовательный текст читается на mobile без масштабирования.

### NFR-A11Y-003
CTA имеют достаточную область нажатия.

## 9. Maintainability

### NFR-MAINT-001
Контент отделён от UI-кода.

### NFR-MAINT-002
Список market assets конфигурируемый.

### NFR-MAINT-003
Market Replay analysis rules конфигурируемые, а не захардкоженные по экрану.

## 10. Observability

### NFR-OBS-001
Backend логирует startup, ошибки MAX validation, API errors, market provider errors и simulation transaction errors.

### NFR-OBS-002
Пользователь не получает production stack trace.

## 11. Availability

Для хакатона критична стабильная доступность во время тестирования, демо и оценки жюри. Enterprise SLA в MVP не задаётся.
