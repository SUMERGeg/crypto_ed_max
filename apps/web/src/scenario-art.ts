const scenarioArt: Record<string, string> = {
  "global-shock-2020": "/assets/scenarios/global-shock-2020.webp",
  "boom-2017-2018": "/assets/scenarios/boom-2017-2018.webp",
  "winter-2021-2022": "/assets/scenarios/winter-2021-2022.webp",
  "recovery-2023-2024": "/assets/scenarios/recovery-2023-2024.webp",
  "modern-2024-2025": "/assets/scenarios/modern-2024-2025.webp",
};

export function scenarioArtFor(scenarioId: string): string {
  return scenarioArt[scenarioId] ?? "/assets/scenarios/global-shock-2020.webp";
}
