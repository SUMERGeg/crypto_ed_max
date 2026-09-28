/** CSS cubic-bezier with linear time maps exactly to v*t + (fall-v)*t². */
export function coinFallTiming(velocity: number, fall: number) {
  const y1 = velocity / (3 * fall);
  const y2 = (fall + velocity) / (3 * fall);
  return { y1, y2, css: `cubic-bezier(${1 / 3}, ${y1}, ${2 / 3}, ${y2})` };
}
