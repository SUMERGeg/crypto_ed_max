import { Bitcoin, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const COIN_COUNT = 14;
const EFFECT_DURATION_MS = 1900;

export function CoinRainButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const [shell, setShell] = useState<Element | null>(null);
  const [run, setRun] = useState(0);
  const [active, setActive] = useState(false);

  useEffect(() => () => {
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
  }, []);

  function startRain() {
    setShell(buttonRef.current?.closest(".phone-shell") ?? null);
    setRun((current) => current + 1);
    setActive(true);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setActive(false), EFFECT_DURATION_MS);
  }

  return (
    <>
      <button ref={buttonRef} className="coin-rain-button" type="button" onClick={startRain} aria-label="Запустить дождь из биткоинов" title="Нажми на меня">
        <Sparkles size={17} aria-hidden="true" />
      </button>
      {active && shell && createPortal(
        <div className="coin-rain" key={run} aria-hidden="true">
          {Array.from({ length: COIN_COUNT }, (_, index) => (
            <span
              className="coin-rain__coin"
              key={index}
              style={{
                left: `${6 + ((index * 37 + run * 13) % 88)}%`,
                animationDelay: `${(index * 127) % 600}ms`,
                animationDuration: `${1100 + ((index * 173) % 480)}ms`,
                "--coin-drift": `${(index % 2 ? 1 : -1) * (12 + ((index * 7) % 24))}px`,
              } as CSSProperties}
            >
              <Bitcoin size={18} strokeWidth={2.7} />
            </span>
          ))}
        </div>,
        shell,
      )}
      <span className="visually-hidden" role="status">{active ? "Биткоины сыплются!" : ""}</span>
    </>
  );
}
