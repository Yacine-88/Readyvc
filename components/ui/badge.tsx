interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  className?: string;
}

const variantStyles = {
  default: "bg-soft border-border text-muted",
  success: "bg-success-soft border-success-border text-success",
  warning: "bg-warning-soft border-warning-border text-warning",
  danger: "bg-danger-soft border-danger-border text-danger",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

interface PillProps {
  children: React.ReactNode;
  className?: string;
}

export function Pill({ children, className = "" }: PillProps) {
  return (
    <span
      className={`inline-flex items-center px-3 py-1.5 rounded-full border border-accent-border bg-accent-soft text-accent text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}
