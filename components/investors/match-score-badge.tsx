/**
 * MatchScoreBadge — pill showing a fit percentage with a color band.
 * Color bands:
 *   ≥75 accent, 60–74 ink, 45–59 muted, <45 soft.
 */

type Size = "sm" | "md" | "lg";

interface MatchScoreBadgeProps {
  score: number; // expected 0-100
  size?: Size;
  className?: string;
}

function bandClasses(score: number): string {
  if (score >= 75) return "bg-accent/15 text-accent border-accent/30";
  if (score >= 60) return "bg-ink text-white border-ink";
  if (score >= 45) return "bg-soft text-ink border-border-strong";
  return "bg-soft text-muted border-border";
}

const sizeClasses: Record<Size, string> = {
  sm: "h-7 px-2.5 text-[11px]",
  md: "h-8 px-3 text-xs",
  lg: "h-10 px-4 text-sm",
};

export function MatchScoreBadge({
  score,
  size = "md",
  className = "",
}: MatchScoreBadgeProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(score)));
  return (
    <span
      className={`inline-flex items-center justify-center gap-1 rounded-full border font-semibold font-mono tabular-nums ${bandClasses(
        clamped
      )} ${sizeClasses[size]} ${className}`}
      aria-label={`Fit score ${clamped}%`}
      title={`Fit score ${clamped}%`}
    >
      <span>{clamped}</span>
      <span className="opacity-70">%</span>
    </span>
  );
}
