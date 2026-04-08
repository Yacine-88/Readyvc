import Link from "next/link";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  href?: string;
  hover?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingStyles = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  children,
  className = "",
  href,
  hover = false,
  padding = "md",
}: CardProps) {
  const baseStyles = `bg-card border border-border rounded-[var(--radius-lg)] ${paddingStyles[padding]}`;
  const hoverStyles = hover
    ? "transition-all duration-150 hover:-translate-y-0.5 hover:border-ink/20 hover:shadow-md"
    : "";

  const combinedClassName = `${baseStyles} ${hoverStyles} ${className}`;

  if (href) {
    return (
      <Link href={href} className={`block ${combinedClassName}`}>
        {children}
      </Link>
    );
  }

  return <div className={combinedClassName}>{children}</div>;
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className = "" }: CardHeaderProps) {
  return (
    <div
      className={`px-5 py-4 border-b border-border bg-soft flex items-center justify-between gap-4 -mx-5 -mt-5 mb-5 rounded-t-[var(--radius-lg)] ${className}`}
    >
      {children}
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  kicker?: string;
  className?: string;
}

export function CardTitle({ children, kicker, className = "" }: CardTitleProps) {
  return (
    <div className={className}>
      {kicker && <p className="eyebrow mb-1">{kicker}</p>}
      <h3 className="text-sm font-bold tracking-tight">{children}</h3>
    </div>
  );
}

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CardContent({ children, className = "" }: CardContentProps) {
  return <div className={className}>{children}</div>;
}
