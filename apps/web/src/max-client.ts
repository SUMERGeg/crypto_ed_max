type MaxBackButton = {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
};

declare global {
  interface Window {
    WebApp?: { initData?: string; BackButton?: MaxBackButton };
  }
}

export function extractMaxLaunchData(bridgeData: string | undefined, hash: string) {
  if (bridgeData) return bridgeData;
  return new URLSearchParams(hash.replace(/^#/, "")).get("WebAppData") ?? "";
}

export function currentMaxLaunchData() {
  return extractMaxLaunchData(window.WebApp?.initData, window.location.hash);
}
