import { Bitcoin, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const COIN_COUNT = 14;
const EFFECT_DURATION_MS = 1900;

type CoinBurst = {
  id: number;
  x: number;
  y: number;
  width: number;
  fall: number;
};

export function CoinRainButton() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nextBurstId = useRef(0);
  const timeoutRefs = useRef<Set<number>>(new Set());
  const [shell, setShell] = useState<Element | null>(null);
  const [bursts, setBursts] = useState<CoinBurst[]>([]);

  useEffect(() => () => {
    timeoutRefs.current.forEach((timeout) => window.clearTimeout(timeout));
    timeoutRefs.current.clear();
  }, []);

  function startBurst() {
    const button = buttonRef.current;
    const container = button?.closest(".phone-shell");
    if (!button || !container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const buttonRect = button.getBoundingClientRect();
    const shellRect = container.getBoundingClientRect();
    const x = buttonRect.left - shellRect.left + buttonRect.width / 2;
    const y = buttonRect.top - shellRect.top + buttonRect.height / 2;
    const id = nextBurstId.current++;
    setShell(container);
    setBursts((current) => [...current, { id, x, y, width: shellRect.width, fall: shellRect.height - y + 36 }]);

    const timeout = window.setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
      timeoutRefs.current.delete(timeout);
    }, EFFECT_DURATION_MS);
    timeoutRefs.current.add(timeout);
  }

  return (
    <>
      <button ref={buttonRef} className="coin-rain-button" type="button" onClick={startBurst} aria-label="Запустить фейерверк из биткоинов" title="Нажми на меня">
        <Sparkles size={17} aria-hidden="true" />
      </button>
      {bursts.length > 0 && shell && createPortal(
        <div className="coin-rain" aria-hidden="true">
          {bursts.flatMap((burst) => Array.from({ length: COIN_COUNT }, (_, index) => {
            const slot = (index * 5 + burst.id * 3) % COIN_COUNT;
            const targetX = 24 + (slot + .5) * (Math.max(0, burst.width - 48) / COIN_COUNT);
            const distance = targetX - burst.x;
            const apex = burst.y * .45 + 12 + (index * 19 + burst.id * 11) % 22;
            return <span
              className="coin-rain__coin"
              key={`${burst.id}-${index}`}
              style={{
                left: burst.x,
                top: burst.y,
                animationDelay: `${(index * 47 + burst.id * 13) % 140}ms`,
                animationDuration: `${1350 + (index * 71) % 280}ms`,
                "--coin-x": `${distance}px`,
                "--coin-apex": `${-apex}px`,
                "--coin-fall": `${burst.fall}px`,
                "--coin-spin": `${distance < 0 ? -1 : 1}turn`,
              } as CSSProperties}
            >
              <Bitcoin size={18} strokeWidth={2.7} />
            </span>;
          }))}
        </div>,
        shell,
      )}
      <span className="visually-hidden" role="status">{bursts.length > 0 ? "Биткоины разлетаются!" : ""}</span>
    </>
  );
}
