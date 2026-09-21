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
