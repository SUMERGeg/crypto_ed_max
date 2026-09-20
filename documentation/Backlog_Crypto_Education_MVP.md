# Backlog — Crypto Education MVP

## 1. Приоритизация

Используется MoSCoW:
- **Must** — обязательно для минимального hackathon build;
- **Should** — желательно для полного MVP;
- **Could** — вырезается первым.

## EPIC 0 — Foundation / MAX

| ID | Приоритет | Задача |
|---|---|---|
| FND-01 | Must | Создать React/Vite mini-app shell |
| FND-02 | Must | Создать Node.js/Express API |
| FND-03 | Must | Настроить БД и миграции |
| FND-04 | Must | Интегрировать запуск из MAX |
| FND-05 | Must | Реализовать backend validation MAX initData |
| FND-06 | Must | Автоматически создавать/получать User по MAX ID |
| FND-07 | Must | Реализовать базовую навигацию |
| FND-08 | Should | Добавить error boundary / fallback UI |

## EPIC 1 — Главная

| ID | Приоритет | Задача |
|---|---|---|
| HOME-01 | Must | Экран Главной |
| HOME-02 | Must | Карточка «Продолжить обучение» |
| HOME-03 | Must | Общий прогресс |
| HOME-04 | Must | Быстрые переходы |
| HOME-05 | Should | Краткие котировки |
| HOME-06 | Should | Последняя новость |
| HOME-07 | Could | Расширенные анимации робота |

## EPIC 2 — Учиться

| ID | Приоритет | Задача |
|---|---|---|
| LEARN-01 | Must | Экран 4 образовательных направлений |
| LEARN-02 | Must | Экран списка уроков |
| LEARN-03 | Must | Экран урока |
| LEARN-04 | Must | Статусы уроков |
| LEARN-05 | Must | Сохранение LessonProgress |
| LEARN-06 | Must | Расчёт прогресса направления |
| LEARN-07 | Must | Подготовить 5 уроков × 4 направления с нарастающей сложностью |
| LEARN-08 | Should | Иллюстрации и подсказки робота |

## EPIC 3 — Мини-тесты

| ID | Приоритет | Задача |
|---|---|---|
| QUIZ-01 | Must | Экран вопроса |
| QUIZ-02 | Must | Submit теста на backend |
| QUIZ-03 | Must | Проверка ответов |
| QUIZ-04 | Must | Экран результата |
| QUIZ-05 | Must | Сохранение QuizAttempt |
| QUIZ-06 | Must | Завершение LessonProgress |
| QUIZ-07 | Should | Повторные попытки |
| QUIZ-08 | Should | Пояснения по ответам |

## EPIC 4 — Historical Market Replay

| ID | Приоритет | Задача |
|---|---|---|
| SIM-01 | Must | Экран списка сценариев |
| SIM-02 | Must | Подготовить один demo scenario dataset |
| SIM-03 | Must | Создание SimulationSession |
| SIM-04 | Must | Экран replay |
| SIM-05 | Must | Ускоренное историческое время |
| SIM-06 | Must | Исторический график без future data |
| SIM-07 | Must | Портфель и cash balance |
| SIM-08 | Must | Pause / Resume |
| SIM-09 | Must | Показ ScenarioEvent по времени |
| SIM-10 | Must | BUY |
| SIM-11 | Must | SELL |
| SIM-12 | Must | История операций |
| SIM-13 | Must | Завершение сценария |
| SIM-14 | Must | Расчёт доходности |
| SIM-15 | Must | Benchmark |
| SIM-16 | Must | Deterministic educational analysis |
| SIM-17 | Should | Второй исторический сценарий |
| SIM-18 | Should | Все 5 сценариев |
| SIM-19 | Could | Дополнительные benchmarks |
| SIM-20 | Could | Расширенная аналитика поведения |

## EPIC 5 — Безопасность

| ID | Приоритет | Задача |
|---|---|---|
| SEC-01 | Should | Экран списка кейсов |
| SEC-02 | Should | Экран учебного кейса |
| SEC-03 | Should | Выбор действия |
| SEC-04 | Should | Разбор + red flags |
| SEC-05 | Should | Сохранение прогресса |
| SEC-06 | Should | Подготовить 3 кейса |
| SEC-07 | Could | База угроз |
| SEC-08 | Could | 5+ карточек угроз |

## EPIC 6 — Крипторынок

| ID | Приоритет | Задача |
|---|---|---|
| MKT-01 | Should | Интеграция backend с market-data API |
| MKT-02 | Should | Кеш котировок |
| MKT-03 | Should | Список 3–5 активов |
| MKT-04 | Should | Детальный экран актива |
| MKT-05 | Should | График |
| MKT-06 | Should | Loading/error/stale states |
| MKT-07 | Could | Несколько периодов графика |
| MKT-08 | Could | Сравнение нескольких площадок |

## EPIC 7 — Новости

| ID | Приоритет | Задача |
|---|---|---|
| NEWS-01 | Should | API списка новостей |
| NEWS-02 | Should | Экран списка |
| NEWS-03 | Should | Экран карточки |
| NEWS-04 | Should | Источник + дисклеймер |
| NEWS-05 | Should | Подготовить 3–5 новостей |
| NEWS-06 | Could | Фильтрация по категориям |

## EPIC 8 — Профиль

| ID | Приоритет | Задача |
|---|---|---|
| PROF-01 | Must | Экран профиля |
| PROF-02 | Must | Общий прогресс |
| PROF-03 | Must | Прогресс по направлениям |
| PROF-04 | Must | Лучшие результаты тестов |
| PROF-05 | Must | Завершённые Market Replay |
| PROF-06 | Should | Количество кейсов безопасности |
| PROF-07 | Could | Достижения |
| PROF-08 | Could | Расширенная статистика |

## EPIC 9 — Контент и данные

| ID | Приоритет | Задача |
|---|---|---|
| DATA-01 | Must | Утвердить Content Model |
| DATA-02 | Must | Создать seed образовательного контента |
| DATA-03 | Must | Верифицировать historical dataset demo scenario |
| DATA-04 | Must | Подготовить события demo scenario |
| DATA-05 | Must | Указать источники событий |
| DATA-06 | Should | Подготовить остальные сценарии |
| DATA-07 | Should | Подготовить новости |
| DATA-08 | Should | Подготовить security cases |

## EPIC 10 — Quality / Demo

| ID | Приоритет | Задача |
|---|---|---|
| QA-01 | Must | Smoke test основного demo flow |
| QA-02 | Must | Проверить mobile viewport |
| QA-03 | Must | Проверить MAX launch |
| QA-04 | Must | Проверить запрет future data в replay |
| QA-05 | Must | Проверить trade validation |
| QA-06 | Must | Проверить сохранение progress |
| QA-07 | Should | Проверить fallback market API |
| QA-08 | Must | Подготовить demo seed |
| QA-09 | Must | Подготовить сценарий защиты |

## Рекомендуемый порядок реализации

1. Foundation.
2. Учиться + Quiz + Profile progress.
3. Один Market Replay end-to-end.
4. Главная.
5. Безопасность.
6. Крипторынок + новости.
7. Дополнительные Market Replay.
8. P2 polish.

Критическое правило: не переходить к пяти сценариям, пока один сценарий не проходит полный flow без ошибок.
