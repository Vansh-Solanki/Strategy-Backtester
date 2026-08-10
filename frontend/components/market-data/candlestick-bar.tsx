import type { PriceBar } from "@/lib/api-client";

const GREEN = "#1D9E75";
const RED = "#E24B4A";

export interface CandleDatum extends PriceBar {
  wickRange: [number, number];
  bodyRange: [number, number];
}

export function toCandleData(bars: PriceBar[]): CandleDatum[] {
  return bars
    .filter(
      (bar) =>
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.close)
    )
    .map((bar) => ({
      ...bar,
      wickRange: [bar.low, bar.high],
      bodyRange: [Math.min(bar.open, bar.close), Math.max(bar.open, bar.close)],
    }));
}

interface BarShapeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandleDatum;
}

interface ValidGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  payload: CandleDatum;
}

function validGeometry(props: BarShapeProps): ValidGeometry | null {
  const { x, y, width, height, payload } = props;
  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    !payload
  ) {
    return null;
  }
  return { x: x as number, y: y as number, width: width as number, height: height as number, payload };
}

// Custom shapes for the two `<Bar>` layers that make up a candlestick: a thin
// "wick" bar spanning [low, high] and a wider "body" bar spanning
// [min(open, close), max(open, close)]. Both use Recharts' native range-bar
// support (an array-valued dataKey), so x/y/width/height already reflect the
// real y-axis scale — no manual scale access needed.
export function WickShape(props: BarShapeProps) {
  const geo = validGeometry(props);
  if (!geo) return null;
  const { x, y, width, height, payload } = geo;
  const fill = payload.close >= payload.open ? GREEN : RED;
  const midX = x + width / 2;
  return <rect x={midX - 0.5} y={y} width={1} height={Math.max(height, 1)} fill={fill} />;
}

export function BodyShape(props: BarShapeProps) {
  const geo = validGeometry(props);
  if (!geo) return null;
  const { x, y, width, height, payload } = geo;
  const fill = payload.close >= payload.open ? GREEN : RED;
  return <rect x={x} y={y} width={width} height={Math.max(height, 1)} fill={fill} />;
}
