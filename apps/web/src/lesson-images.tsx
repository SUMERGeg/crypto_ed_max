import { useState } from "react";
import dimensions from "./lesson-image-dimensions.json";

const pending = new Map<string, Promise<void>>();

// Reuse in-flight requests; failures may be retried on the next visit.
export function preloadImage(src: string, priority: "high" | "low" = "low") {
  const existing = pending.get(src);
  if (existing) return existing;
  const image = new Image();
  image.fetchPriority = priority;
  const promise = new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => { pending.delete(src); resolve(); };
  });
  pending.set(src, promise);
  image.src = src;
  return promise;
}

export function LessonIllustration({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  const size = (dimensions as Record<string, number[]>)[src] ?? [3, 2];
  return <figure className="lesson-page-card__illustration">
    <div className={`lesson-artwork lesson-artwork--${status}`} style={{ aspectRatio: `${size[0]} / ${size[1]}` }} aria-busy={status === "loading"}>
      {status === "loading" && <span className="lesson-artwork__placeholder" role="status">Загружаем иллюстрацию…</span>}
      {status === "error" ? <button className="lesson-artwork__retry" type="button" onClick={() => { setAttempt(attempt + 1); setStatus("loading"); }}>Иллюстрация не загрузилась. Повторить</button> :
        <img key={attempt} src={src} alt={alt} width={size[0]} height={size[1]} loading="eager" fetchPriority="high" decoding="async"
          onLoad={async (event) => {
            const image = event.currentTarget;
            try { await image.decode(); } catch { /* Already loaded images can still be displayed. */ }
            setStatus("ready");
          }} onError={() => setStatus("error")} />}
    </div>
    {caption && <figcaption>{caption}</figcaption>}
  </figure>;
}
