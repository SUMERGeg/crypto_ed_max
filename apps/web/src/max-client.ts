type MaxBackButton = {
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
};

type MaxDeviceStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
};

declare global {
  interface Window {
    WebApp?: {
      initData?: string;
      BackButton?: MaxBackButton;
      DeviceStorage?: MaxDeviceStorage;
    };
  }
}

export function extractMaxLaunchData(bridgeData: string | undefined, hash: string) {
  if (bridgeData) return bridgeData;
  return new URLSearchParams(hash.replace(/^#/, "")).get("WebAppData") ?? "";
}

export function currentMaxLaunchData() {
  return extractMaxLaunchData(window.WebApp?.initData, window.location.hash);
}

export function maxLaunchDestination(initData: string): string | null {
  const payload = new URLSearchParams(initData).get("start_param");
  if (payload === "home") return "/";
  if (payload === "route" || payload === "profile") return `/${payload}`;
  const match = /^(lesson|case|replay):([a-z0-9-]+)$/.exec(payload ?? "");
  if (!match) return null;
  const prefix = match[1] === "lesson" ? "/lessons/" : match[1] === "case" ? "/security/cases/" : "/practice/";
  return `${prefix}${match[2]}?from=route`;
}
