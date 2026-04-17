/**
 * ActivityMiniChart — tiny SVG bar chart of yearly deal activity.
 * Self-contained: no external deps.
 */

interface ActivityMiniChartProps {
  /** Map of year -> deal count. e.g. { 2019: 3, 2020: 5, 2023: 2 } */
  data: Record<number, number>;
  years?: number[]; // defaults to 2019..2023
  height?: number; // bar area height in px
  className?: string;
  showYearLabels?: boolean;
}

const DEFAULT_YEARS = [2019, 2020, 2021, 2022, 2023];

export function ActivityMiniChart({
  data,
  years = DEFAULT_YEARS,
  height = 48,
  className = "",
  showYearLabels = true,
}: ActivityMiniChartProps) {
  const series = years.map((y) => ({ year: y, count: Math.max(0, data[y] ?? 0) }));
  const max = Math.max(1, ...series.map((s) => s.count));
  const w = 160;
  const h = height;
  const gap = 4;
  const barWidth = (w - gap * (series.length - 1)) / series.length;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        height={h}
        preserveAspectRatio="none"
        aria-label="Yearly deal activity"
      >
        {series.map((s, i) => {
          const bh = (s.count / max) * (h - 2);
          const x = i * (barWidth + gap);
          const y = h - bh;
          return (
            <g key={s.year}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(1, bh)}
                className="fill-ink"
                rx={1}
              />
            </g>
          );
        })}
      </svg>
      {showYearLabels && (
        <div className="flex justify-between mt-1 font-mono text-[10px] text-muted">
          {series.map((s) => (
            <span key={s.year} className="tabular-nums">
              {String(s.year).slice(2)}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
