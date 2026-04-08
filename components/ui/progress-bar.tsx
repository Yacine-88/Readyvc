interface ProgressBarProps {
  value: number;
  max?: number;
  status?: "good" | "warning" | "danger" | "neutral";
  showLabel?: boolean;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

const statusColors = {
  good: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-ink",
};

export function ProgressBar({
  value,
  max = 100,
  status = "neutral",
  showLabel = false,
  label,
  size = "md",
  className = "",
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className={className}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between gap-2 mb-2">
          {label && <span className="eyebrow">{label}</span>}
          {showLabel && (
            <span className="text-xs font-bold text-ink">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div
        className={`w-full ${height} bg-border rounded-full overflow-hidden`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={`${height} rounded-full transition-all duration-500 ease-out ${statusColors[status]}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
