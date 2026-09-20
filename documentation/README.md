# Crypto Education — Documentation Index

## Product / Scope
1. Product Vision
2. Feature Vision — Учиться
3. Feature Vision — Практиковаться / Historical Market Replay
4. Feature Vision — Безопасность
5. Feature Vision — Крипторынок
6. Feature Vision — Профиль
7. MVP Scope

## Analysis / Requirements
8. User Flows
9. Functional Requirements
10. Business Rules
11. Content Model
11.1. Правила простого языка — `Content_Guidelines_Simple_Language.md`
12. Acceptance Criteria
13. NFR

## Technical Design
14. Data Model / ERD
15. API Contract — `openapi.yaml`
16. API Contract Notes
17. System Architecture

## Delivery
18. Backlog
19. Test Checklist

## Следующий шаг
Первый вертикальный срез уже реализован: обучение и один полный Historical Market Replay. Исторический dataset сценария версии 1.2.0 хранится локально, содержит дневные цены из Binance Spot API и 15 событий шести категорий с первоисточниками. Год воспроизводится за 6 минут — примерно один день в секунду. Будущие цены и события фильтруются backend по текущему историческому времени.

Следующий этап:
1. добавить ещё четыре исторических сценария на универсальном формате;
2. расширить итоговый разбор графиком капитала и поведенческими признаками;
3. реализовать отдельный редакционный раздел новостей;
4. после этого дополнить профиль историей прохождений.
