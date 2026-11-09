interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

const RADIUS = 40;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ data }: { data: DonutSegment[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const segmentLength = (value: number) => (total === 0 ? 0 : (value / total) * CIRCUMFERENCE);
  const segments = data.map((segment, index) => {
    const cumulative = data
      .slice(0, index)
      .reduce((sum, d) => sum + segmentLength(d.value), 0);
    return { ...segment, length: segmentLength(segment.value), dashoffset: -cumulative };
  });

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
      <svg viewBox="0 0 110 110" width="110" height="110" className="shrink-0">
        <circle
          cx="55"
          cy="55"
          r={RADIUS}
          fill="none"
          stroke="var(--color-surface-muted)"
          strokeWidth="16"
        />
        {segments.map((segment) => {
          const { length, dashoffset } = segment;

          return (
            <circle
              key={segment.label}
              cx="55"
              cy="55"
              r={RADIUS}
              fill="none"
              stroke={segment.color}
              strokeWidth="16"
              strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
              strokeDashoffset={dashoffset}
              transform="rotate(-90 55 55)"
            />
          );
        })}
      </svg>
      <ul className="flex flex-col gap-2">
        {data.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: segment.color }}
              aria-hidden="true"
            />
            <span className="text-text-muted">{segment.label}</span>
            <span className="font-mono tabular-nums text-text">
              {total === 0 ? 0 : Math.round((segment.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
