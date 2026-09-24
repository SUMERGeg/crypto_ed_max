type RouteStop = { type: "LESSON" | "SECURITY_CASE" | "REPLAY"; contentId: string };

export function routeStopPath(stop: RouteStop) {
  const prefix = stop.type === "LESSON" ? "/lessons" : stop.type === "SECURITY_CASE" ? "/security/cases" : "/practice";
  return `${prefix}/${encodeURIComponent(stop.contentId)}?from=route`;
}

export function contextualFollowUp(courseId: string) {
  if (courseId.startsWith("finance-")) return "/practice";
  if (courseId.startsWith("law-")) return "/security";
  return "/market";
}

export function backDestination({ fromRoute, parent }: { fromRoute: boolean; parent: string }) {
  return fromRoute ? "/route" : parent;
}
