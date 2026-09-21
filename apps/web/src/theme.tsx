import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
};

const STORAGE_KEY = "crypto-education-theme";
const ThemeContext = createContext<ThemeContextValue | null>(null);

function initialTheme(): Theme {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [deviceStorageReady, setDeviceStorageReady] = useState(false);
  const manuallySelected = useRef(false);

  const setTheme = useCallback((nextTheme: Theme) => {
    manuallySelected.current = true;
    setThemeState(nextTheme);
  }, []);

  useLayoutEffect(() => {
    const scheme = theme === "light" ? "only light" : "only dark";
    document.documentElement.style.colorScheme = scheme;
    document.querySelector('meta[name="color-scheme"]')?.setAttribute("content", scheme);
    document.documentElement.style.backgroundColor = theme === "dark" ? "#07111f" : "#f4f7fb";
    document.body.style.backgroundColor = theme === "dark" ? "#07111f" : "#f4f7fb";
    window.localStorage.setItem(STORAGE_KEY, theme);

    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    themeColor?.setAttribute("content", theme === "dark" ? "#07111f" : "#f4f7fb");
  }, [theme]);

  useEffect(() => {
    let active = true;
    const storedTheme = window.WebApp?.DeviceStorage?.getItem(STORAGE_KEY);
    if (!storedTheme) return;

    storedTheme
      .then((saved) => {
        if (!active) return;
        if (!manuallySelected.current && (saved === "light" || saved === "dark")) {
          setThemeState(saved);
        }
        setDeviceStorageReady(true);
      })
      .catch(() => {
        if (active) setDeviceStorageReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!deviceStorageReady) return;
    void window.WebApp?.DeviceStorage?.setItem(STORAGE_KEY, theme).catch(() => undefined);
  }, [deviceStorageReady, theme]);

  const value = useMemo(() => ({ theme, setTheme }), [theme]);
  return (
    <ThemeContext.Provider value={value}>
      <div className="crypto-theme-boundary" data-crypto-theme={theme}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
}
