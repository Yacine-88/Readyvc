interface StatBlockProps {
  label: string;
  value: string | number;
  description?: string;
  status?: "good" | "warning" | "danger" | "neutral";
  className?: string;
}

const statusColors = {
  good: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  neutral: "text-ink",
};

export function StatBlock({
  label,
  value,
  description,
  status = "neutral",
  className = "",
}: StatBlockProps) {
  return (
    <div className={`bg-soft border border-border rounded-[var(--radius-md)] p-4 ${className}`}>
      <p className="eyebrow mb-2">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight leading-none mb-1 ${statusColors[status]}`}>
        {value}
      </p>
      {description && (
        <p className="text-xs text-ink-secondary leading-relaxed">{description}</p>
      )}
    </div>
  );
}

interface LargeStatProps {
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function LargeStat({ label, value, description, className = "" }: LargeStatProps) {
  return (
    <div className={className}>
      <p className="eyebrow mb-2">{label}</p>
      <p className="text-6xl md:text-7xl font-extrabold tracking-tighter leading-none mb-2">
        {value}
      </p>
      {description && (
        <p className="text-sm text-ink-secondary leading-relaxed max-w-sm">{description}</p>
      )}
    </div>
  );
}
