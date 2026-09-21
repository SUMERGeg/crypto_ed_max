export type MarketChartValue = { at: string; priceRub: number };
export type PositionedMarketChartValue = MarketChartValue & { x: number; y: number };

const padding = { left: 10, right: 54, top: 12, bottom: 18 };

export function buildChartGeometry(series: MarketChartValue[], width: number, height: number) {
  const prices = series.map((point) => point.priceRub);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const spread = Math.max(rawMax - rawMin, rawMax * 0.01, 1);
  const minScale = rawMin - spread * 0.08;
  const maxScale = rawMax + spread * 0.08;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const points = series.map<PositionedMarketChartValue>((point, index) => ({
    ...point,
    x: padding.left + (series.length === 1 ? plotWidth : (index / (series.length - 1)) * plotWidth),
    y: padding.top + ((maxScale - point.priceRub) / (maxScale - minScale)) * plotHeight,
  }));
  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const ratio = index / 3;
    return {
      price: maxScale - ratio * (maxScale - minScale),
      y: padding.top + ratio * plotHeight,
    };
  });
  const linePoints = points.map((point) => `${round(point.x)},${round(point.y)}`).join(" ");
  const baseline = height - padding.bottom;

  return {
    points,
    yTicks,
    linePoints,
    areaPoints: `${padding.left},${baseline} ${linePoints} ${width - padding.right},${baseline}`,
    minPrice: rawMin,
    maxPrice: rawMax,
    plotRight: width - padding.right,
    baseline,
  };
}

export function nearestChartPoint(points: PositionedMarketChartValue[], x: number) {
  if (!points.length) return -1;
  let result = 0;
  for (let index = 1; index < points.length; index += 1) {
    if (Math.abs(points[index]!.x - x) < Math.abs(points[result]!.x - x)) result = index;
  }
  return result;
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}
