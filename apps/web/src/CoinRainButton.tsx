import { Bitcoin, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { coinFallTiming } from "./coin-flight";

const COIN_COUNT = 18;
const EFFECT_DURATION_MS = 2100;

type CoinParticle = {
  id: number;
  dx: number;
  velocity: number;
  fall: number;
  duration: number;
  delay: number;
  spin: number;
};

type CoinBurst = {
  id: number;
  x: number;
  y: number;
  coins: CoinParticle[];
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
    const slots = Array.from({ length: COIN_COUNT }, (_, index) => index);
    for (let index = slots.length - 1; index > 0; index--) {
      const other = Math.floor(Math.random() * (index + 1));
      [slots[index], slots[other]] = [slots[other]!, slots[index]!];
    }
    const coins = slots.map((slot, index) => {
      const targetX = 24 + ((slot + .15 + Math.random() * .7) / COIN_COUNT) * Math.max(0, shellRect.width - 48);
      const velocity = index % 3 === 0 ? -270 - Math.random() * 180
        : index % 3 === 1 ? -90 + Math.random() * 150
          : 90 + Math.random() * 140;
      return {
        id: index,
        dx: targetX - x,
        velocity,
        fall: shellRect.height - y + 40 + Math.random() * 60,
        duration: 1350 + Math.random() * 500,
        delay: Math.random() * 150,
        spin: (Math.random() < .5 ? -1 : 1) * (1 + Math.random() * 1.5),
      };
    });
    setShell(container);
    setBursts((current) => [...current, { id, x, y, coins }]);

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
          {bursts.flatMap((burst) => burst.coins.map((coin) => <span
              className="coin-rain__flight"
              key={`${burst.id}-${coin.id}`}
              style={{
                left: burst.x,
                top: burst.y,
                "--coin-delay": `${coin.delay}ms`,
                "--coin-duration": `${coin.duration}ms`,
                "--coin-x": `${coin.dx}px`,
                "--coin-fall": `${coin.fall}px`,
                "--coin-fall-easing": coinFallTiming(coin.velocity, coin.fall).css,
                "--coin-spin": `${coin.spin}turn`,
              } as CSSProperties}
            >
              <span className="coin-rain__coin"><Bitcoin size={18} strokeWidth={2.7} /></span>
            </span>))}
        </div>,
        shell,
      )}
      <span className="visually-hidden" role="status">{bursts.length > 0 ? "Биткоины разлетаются!" : ""}</span>
    </>
  );
}
