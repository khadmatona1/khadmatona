interface BarDatum {
  label: string;
  value: number;
}

/**
 * Hand-rolled SVG-free bar rendering rather than a charting dependency -
 * the data set is small (a handful of months), so a library buys nothing
 * here.
 */
export function BarChart({ data }: { data: BarDatum[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex h-40 items-end gap-3">
      {data.map((d) => (
        <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-sm bg-gradient-to-t from-gold-primary to-gold-secondary"
            style={{ height: `${(d.value / max) * 100}%` }}
            title={`${d.label}: ${d.value}`}
          />
          <span className="font-mono text-[0.68rem] text-text-muted">
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}
