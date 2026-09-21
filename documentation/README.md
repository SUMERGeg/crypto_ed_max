# Crypto Education — Documentation Index

## Product / Scope
1. Product Vision
2. Feature Vision — Учиться
3. Feature Vision — Практиковаться / Historical Market Replay
4. Feature Vision — Безопасность
5. Feature Vision — Крипторынок
6. Feature Vision — Профиль
7. Feature Vision — Онбординг нового пользователя
8. MVP Scope

## Analysis / Requirements
9. User Flows
10. Functional Requirements
11. Business Rules
12. Content Model
12.1. Правила простого языка — `Content_Guidelines_Simple_Language.md`
13. Acceptance Criteria
14. NFR

## Technical Design
15. Data Model / ERD
16. API Contract — `openapi.yaml`
17. API Contract Notes
18. System Architecture

## Delivery
19. Backlog
20. Test Checklist

## Следующий шаг
Первый вертикальный срез уже реализован: обучение и один полный Historical Market Replay. Исторический dataset сценария версии 1.2.0 хранится локально, содержит дневные цены из Binance Spot API и 15 событий шести категорий с первоисточниками. Год воспроизводится за 6 минут — примерно один день в секунду. Будущие цены и события фильтруются backend по текущему историческому времени.

Следующий этап:
1. добавить ещё четыре исторических сценария на универсальном формате;
2. расширить итоговый разбор графиком капитала и поведенческими признаками;
3. реализовать отдельный редакционный раздел новостей;
4. после этого дополнить профиль историей прохождений.
