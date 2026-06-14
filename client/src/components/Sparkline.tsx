interface Props {
  data: number[];
  height?: number;
  color?: string;
  fillColor?: string;
}

// Lightweight responsive line chart (SVG). Uses a 0..100 viewBox stretched to the
// container width, with a non-scaling stroke so the line keeps a crisp thickness.
export default function Sparkline({ data, height = 38, color = 'var(--primary)', fillColor }: Props) {
  if (data.length < 2) {
    return <div className="spark-empty" style={{ height }}>Not enough data yet</div>;
  }
  const W = 100;
  const H = 100;
  const max = Math.max(...data);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const n = data.length;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - ((v - min) / range) * (H - 8) - 4; // small vertical padding
    return [x, y] as const;
  });
  const line = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height }} aria-hidden="true">
      <path d={area} fill={fillColor || color} fillOpacity={0.14} stroke="none" />
      <path d={line} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
