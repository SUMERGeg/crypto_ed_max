import type { CryptoLessonPageSpec } from "./crypto-lessons.js";

// Selected explanations already contain parallel points; keep their wording and order.
const listPages: Record<string, readonly number[]> = {
  "law-status": [2, 6],
  "law-taxes": [3, 4],
  "law-payments": [3, 4],
  "law-mining": [2, 4],
  "law-safe-check": [2, 6],
};

function sentences(paragraph: string) {
  return paragraph.split(/(?<=[.!?])\s+(?=[А-ЯЁA-Z«])/u);
}

export function structureLawPage(page: CryptoLessonPageSpec, lessonId: string, pageNumber: number) {
  const paragraphs = page.body.split("\n\n");
  const useList = listPages[lessonId]?.includes(pageNumber);
  return paragraphs.map((paragraph, index) => {
    const parts = sentences(paragraph);
    if (useList && index === 0 && parts.length >= 3) {
      // Keep the scenario before its questions; definitions and checklists are lists throughout.
      if (lessonId === "law-status" && pageNumber === 6) {
        return `${parts[0]}\n\n${parts.slice(1).map(part => `- ${part}`).join("\n")}`;
      }
      return parts.map(part => `- ${part}`).join("\n");
    }
    if (index === 0 && !useList && parts.length > 1) {
      const takeaway = parts.pop()!;
      return `${parts.join(" ")}\n\n> **${takeaway}**`;
    }
    if (/^Пример:/.test(paragraph)) {
      return `> ${parts[0]}${parts.length > 1 ? `\n\n${parts.slice(1).join(" ")}` : ""}`;
    }
    return paragraph;
  }).join("\n\n");
}
