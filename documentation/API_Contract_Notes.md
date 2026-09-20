# API Contract — Notes

Основной контракт находится в `openapi.yaml`.

## Принципы

1. Frontend работает только с backend Crypto Education.
2. External market provider вызывается backend.
3. Correct quiz answers не выдаются до submit.
4. Future Market Replay data не выдаются клиенту.
5. State-changing endpoints требуют authenticated user context.
6. SimulationSession проверяется на принадлежность пользователю.
7. Trade endpoint рекомендуется поддерживать `Idempotency-Key`.
8. Контракт — MVP draft и уточняется после выбора конкретной MAX session/token схемы.
