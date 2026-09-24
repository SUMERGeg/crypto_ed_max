# Connected Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the service sections through the recommended route while retaining unrestricted browsing.

**Architecture:** Add a small client navigation module that converts route stops into URLs, chooses contextual follow-ups and resolves deterministic back destinations. Root pages load the existing route endpoint independently; completion pages consume the shared destination helpers.

**Tech Stack:** React, TypeScript, React Router, node:test, existing API route endpoint.

**Spec:** `docs/superpowers/specs/2026-09-24-connected-navigation-design.md`

## Global Constraints

- Keep the five-item bottom navigation unchanged.
- Keep all learning content freely accessible.
- Do not make investment recommendations or imply that market data is trading advice.
- Preserve MAX initData validation on the backend.
- Reuse existing lazy-loading and skeleton patterns.

## Review Focus

- Route data unavailable: root screens render normally without a broken CTA.
- A direct detail URL has a stable parent fallback rather than leaving the app.
- `?from=route` always returns to `/route`.
- Unknown or complete route state does not create a broken destination.
- Existing post-quiz and post-case CTAs continue to work.

---

### Task 1: Shared navigation decisions

**Files:**
- Create: `apps/web/src/navigation.ts`
- Create: `apps/web/src/navigation.test.ts`

**Interfaces:**
- Produces `routeStopPath(stop)`, `contextualFollowUp(courseId)`, and `backDestination(options)`.
- Consumed by `App.tsx`, `RecommendedRoutePage.tsx`, `LearningPages.tsx`, `SecurityPages.tsx`, and `SimulationPages.tsx`.

- [ ] **Step 1: Write failing tests**

```ts
assert.equal(routeStopPath(lessonStop), "/lessons/crypto-intro?from=route");
assert.equal(contextualFollowUp("finance-risk-return"), "/practice");
assert.equal(backDestination({ fromRoute: true, parent: "/learn" }), "/route");
assert.equal(backDestination({ fromRoute: false, parent: "/learn" }), "/learn");
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/navigation.test.ts`

Expected: FAIL because `navigation.ts` does not exist.

- [ ] **Step 3: Implement the helpers**

```ts
export function contextualFollowUp(courseId: string) {
  if (courseId.startsWith("finance-")) return "/practice";
  if (courseId.startsWith("law-")) return "/security";
  return "/market";
}
```

Route stops use `/lessons`, `/security/cases`, or `/practice` by type and append `?from=route`; `backDestination` returns `/route` only for route origin.

- [ ] **Step 4: Run the helper test**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/navigation.test.ts`

Expected: PASS.

### Task 2: Home and root-section next-step cards

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/LearningPages.tsx`
- Modify: `apps/web/src/SimulationPages.tsx`
- Modify: `apps/web/src/SecurityPages.tsx`
- Modify: `apps/web/src/MarketPages.tsx`
- Modify: `apps/web/src/styles.css`
- Create: `apps/web/src/next-step-card.test.ts`

**Interfaces:**
- Consumes `api.route()` and `routeStopPath(stop)`.
- Produces an optional route CTA that disappears when the endpoint fails or the route is complete.

- [ ] **Step 1: Write failing UI-structure tests**

```ts
assert.match(appSource, /api\.route/);
assert.match(appSource, /Последний разбор/);
assert.match(appSource, /to="\/market"/);
assert.match(learnSource + practiceSource + securitySource + marketSource, /Следующий шаг/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/next-step-card.test.ts`

Expected: FAIL because the route CTA and market link are absent.

- [ ] **Step 3: Implement root-screen CTAs**

Add a reusable `NextStepCard` in `App.tsx` or a focused component file. The home hero links to the current route item. Root pages request route data with abort handling and show a compact card only when a current stop exists. Make the latest-news card a `NavLink` to `/market`.

- [ ] **Step 4: Add responsive styles**

Add one dark and one light card variant; preserve the existing phone-shell spacing and avoid a sixth bottom-nav item.

- [ ] **Step 5: Run the UI-structure test**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/next-step-card.test.ts`

Expected: PASS.

### Task 3: Completion and deterministic back navigation

**Files:**
- Modify: `apps/web/src/App.tsx`
- Modify: `apps/web/src/LearningPages.tsx`
- Modify: `apps/web/src/SecurityPages.tsx`
- Modify: `apps/web/src/SimulationPages.tsx`
- Modify: `apps/web/src/RecommendedRoutePage.tsx`
- Create: `apps/web/src/completion-navigation.test.ts`

**Interfaces:**
- Consumes `contextualFollowUp` and `backDestination` from `navigation.ts`.
- Produces context CTAs and shared back behaviour for direct and route-origin flows.

- [ ] **Step 1: Write failing tests**

```ts
assert.match(learningSource, /contextualFollowUp/);
assert.match(securitySource, /contextualFollowUp/);
assert.match(simulationSource, /routeStopPath|contextualFollowUp/);
assert.match(appSource, /backDestination/);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/completion-navigation.test.ts`

Expected: FAIL because the completion pages and MAX back handler do not use shared helpers.

- [ ] **Step 3: Implement contextual CTAs**

After a passed quiz, offer a single action to market, practice, or security based on course id. After a case, offer Learn. After Replay, keep route return for route origin and otherwise offer the next practical step. Do not replace retry or return controls.

- [ ] **Step 4: Implement deterministic fallback back navigation**

The MAX BackButton resolves a parent destination for direct detail links, while route-origin URLs return to `/route`. Existing visible back controls use the same helper where applicable.

- [ ] **Step 5: Run the completion test**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/completion-navigation.test.ts`

Expected: PASS.

### Task 4: Verification and delivery

**Files:**
- Modify: `docs/superpowers/plans/2026-09-24-connected-navigation.md` to mark completed checklist items.

- [ ] **Step 1: Run navigation-specific tests**

Run: `.\\node_modules\\.bin\\tsx.cmd --test apps/web/src/navigation.test.ts apps/web/src/next-step-card.test.ts apps/web/src/completion-navigation.test.ts`

Expected: PASS.

- [ ] **Step 2: Build the web application**

Run: `npm run build --workspace @crypto-education/web`

Expected: successful Vite production build.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src docs/superpowers/plans/2026-09-24-connected-navigation.md
git commit -m "Connect learning navigation"
```
