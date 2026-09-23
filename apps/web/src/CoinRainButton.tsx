import { Bitcoin, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const COIN_COUNT = 18;
const EFFECT_DURATION_MS = 2600;

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

function verticalOffset(coin: CoinParticle, progress: number) {
  return coin.velocity * progress + (coin.fall - coin.velocity) * progress * progress;
}

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
        duration: 1650 + Math.random() * 650,
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
              className="coin-rain__coin"
              key={`${burst.id}-${coin.id}`}
              style={{
                left: burst.x,
                top: burst.y,
                animationDelay: `${coin.delay}ms`,
                animationDuration: `${coin.duration}ms`,
                "--coin-x-20": `${coin.dx * .2}px`,
                "--coin-y-20": `${verticalOffset(coin, .2)}px`,
                "--coin-x-40": `${coin.dx * .4}px`,
                "--coin-y-40": `${verticalOffset(coin, .4)}px`,
                "--coin-x-60": `${coin.dx * .6}px`,
                "--coin-y-60": `${verticalOffset(coin, .6)}px`,
                "--coin-x-80": `${coin.dx * .8}px`,
                "--coin-y-80": `${verticalOffset(coin, .8)}px`,
                "--coin-x": `${coin.dx}px`,
                "--coin-fall": `${coin.fall}px`,
                "--coin-spin": `${coin.spin}turn`,
              } as CSSProperties}
            >
              <Bitcoin size={18} strokeWidth={2.7} />
            </span>))}
        </div>,
        shell,
      )}
      <span className="visually-hidden" role="status">{bursts.length > 0 ? "Биткоины разлетаются!" : ""}</span>
    </>
  );
}
