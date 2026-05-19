/**
 * Komponen grafik ringan berbasis SVG murni — tidak butuh dependency baru.
 * Dipakai di modul Analytics (Fase 8).
 */

export type ChartPoint = { label: string; value: number };

/** Horizontal bar chart — cocok untuk top-N (course, lab, dll). */
export function BarChart({
  data,
  height = 220,
  formatValue = (v: number) => String(v),
  color = "rgb(99 102 241)",
}: {
  data: ChartPoint[];
  height?: number;
  formatValue?: (v: number) => string;
  color?: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Belum ada data.
      </div>
    );
  }
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2" style={{ minHeight: height }}>
      {data.map((d) => {
        const pct = (d.value / max) * 100;
        return (
          <div key={d.label} className="flex items-center gap-3">
            <div className="w-32 shrink-0 truncate text-xs" title={d.label}>
              {d.label}
            </div>
            <div className="relative h-6 flex-1 rounded bg-muted">
              <div
                className="h-full rounded transition-all"
                style={{ width: `${pct}%`, backgroundColor: color }}
                aria-valuenow={d.value}
                aria-valuemax={max}
                role="progressbar"
              />
            </div>
            <div className="w-14 shrink-0 text-right font-mono text-xs tabular-nums">
              {formatValue(d.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Line/area chart — cocok untuk time series (sertifikat per bulan, dll). */
export function LineChart({
  data,
  height = 200,
  color = "rgb(99 102 241)",
  formatValue = (v: number) => String(v),
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  formatValue?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height }}>
        Belum ada data.
      </div>
    );
  }
  const w = 600;
  const h = height;
  const pad = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = w - pad.left - pad.right;
  const innerH = h - pad.top - pad.bottom;
  const max = Math.max(1, ...data.map((d) => d.value));
  const step = data.length > 1 ? innerW / (data.length - 1) : 0;
  const points = data.map((d, i) => {
    const x = pad.left + i * step;
    const y = pad.top + innerH - (d.value / max) * innerH;
    return { x, y, ...d };
  });
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${path} L${points[points.length - 1].x},${pad.top + innerH} L${points[0].x},${pad.top + innerH} Z`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: h }}>
      {yTicks.map((t) => {
        const y = pad.top + innerH - t * innerH;
        return (
          <g key={t}>
            <line x1={pad.left} y1={y} x2={w - pad.right} y2={y} stroke="currentColor" strokeOpacity={0.1} />
            <text x={pad.left - 6} y={y + 3} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.5}>
              {formatValue(Math.round(max * t))}
            </text>
          </g>
        );
      })}
      <path d={area} fill={color} fillOpacity={0.15} />
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
      {points.map((p) => (
        <g key={p.label}>
          <circle cx={p.x} cy={p.y} r={3} fill={color}>
            <title>{`${p.label}: ${formatValue(p.value)}`}</title>
          </circle>
        </g>
      ))}
      {points.map((p, i) => {
        const showEvery = Math.max(1, Math.ceil(points.length / 8));
        if (i % showEvery !== 0 && i !== points.length - 1) return null;
        return (
          <text
            key={`x-${p.label}`}
            x={p.x}
            y={h - 8}
            textAnchor="middle"
            fontSize={9}
            fill="currentColor"
            fillOpacity={0.6}
          >
            {p.label}
          </text>
        );
      })}
    </svg>
  );
}

/** Donut / stacked progress untuk persentase (mis. kelulusan). */
export function Donut({
  value,
  total,
  size = 120,
  color = "rgb(16 185 129)",
  label,
}: {
  value: number;
  total: number;
  size?: number;
  color?: string;
  label?: string;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;
  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={10} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeDasharray={`${dash} ${c - dash}`}
          strokeDashoffset={c / 4}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2}) rotate(90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={18} fontWeight="700" fill="currentColor">
          {pct}%
        </text>
      </svg>
      {label && <div className="mt-1 text-xs text-muted-foreground">{label}</div>}
    </div>
  );
}
