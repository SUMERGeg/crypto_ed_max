# Connected Navigation Design

## Goal

Turn the existing independent sections into a coherent learning journey while preserving free access to every lesson, case and market scenario.

## User-facing behaviour

1. The primary card on the home screen becomes a **next route stop**. It names the current route item, shows its type and progress, and opens that item.
2. Every root section — Learn, Practice, Security and Market — shows a compact **Next step** card when there is an unfinished route stop. It links to the current route item without blocking normal browsing.
3. The home screen's **Latest analysis** card links to `/market`, not to an investment action or an external source.
4. Completion screens provide one context-aware follow-up. A lesson links to a related app section, a completed security case links to the next available learning action, and a finished Market Replay links to the next route stop. Route-origin flows keep their existing explicit return-to-route button.
5. The route stays a recommendation, not an access-control mechanism: all content is available through the section lists. Incomplete route cards describe the required preceding step rather than appearing as a dead end.
6. Detail-page back navigation is deterministic: return to the route when `?from=route` is present; otherwise return to the parent section. The MAX platform BackButton uses the same fallback map for direct links.

## Architecture

The API already returns `RecommendedRoute`, including the current stop and availability. The client will centralise the conversion of a route stop into an app URL and re-use it in the home page, root-section cards and completion CTAs. A client-side `goBack` helper will resolve route origin, browser history and parent fallbacks consistently.

No course, case, scenario or authentication rules change. Existing `/route` availability remains an explanatory visual state only; direct section links stay open.

## Contextual destinations

| Completed activity | Follow-up destination |
|---|---|
| Lesson in Cryptocurrencies or Blockchain | `/market` |
| Lesson in Financial basics | `/practice` |
| Lesson in Russia and law | `/security` |
| Security case | `/learn` |
| Market Replay | current route stop, otherwise `/practice` |

## Error handling

If route data cannot load, the page still renders its standard content and omits the route card. Route-origin completion buttons keep working from the query parameter without an additional route request.

## Constraints

- Keep the five-item bottom navigation unchanged.
- Keep all learning content freely accessible.
- Do not make investment recommendations or imply that market data is trading advice.
- Preserve MAX initData validation on the backend.
- Reuse existing lazy-loading and skeleton patterns.

## Testing

- Unit-test route-stop URL and contextual destination selection.
- Test that direct access without `?from=route` gets a parent fallback and route access returns to `/route`.
- Test that each root section can render without route data.
