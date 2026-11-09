import { Card } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <p className="text-[0.7rem] font-bold tracking-wide text-text-muted uppercase">
        {label}
      </p>
      <p className="mt-2 font-mono text-2xl font-semibold text-text tabular-nums">
        {value}
      </p>
      {hint && <p className="mt-1 text-[0.78rem] text-text-muted">{hint}</p>}
    </Card>
  );
}
