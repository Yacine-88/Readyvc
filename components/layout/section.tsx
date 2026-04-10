import React from "react";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  bordered?: boolean;
  padding?: "sm" | "md" | "lg" | "none";
}

const paddingStyles = {
  none: "",
  sm: "py-12",
  md: "py-16",
  lg: "py-20",
};

export function Section({
  children,
  className = "",
  bordered = true,
  padding = "md",
  ...rest
}: SectionProps) {
  return (
    <section
      className={`${bordered ? "border-b border-border" : ""} ${paddingStyles[padding]} ${className}`}
      {...rest}
    >
      {children}
    </section>
  );
}

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  narrow?: boolean;
}

export function Container({ children, className = "", narrow = false }: ContainerProps) {
  const maxWidth = narrow ? "max-w-[var(--container-narrow)]" : "max-w-[var(--container-max)]";
  return <div className={`${maxWidth} mx-auto px-6 ${className}`}>{children}</div>;
}

interface SectionHeaderProps {
  kicker?: string;
  title: string;
  description?: string;
  className?: string;
  align?: "left" | "center";
}

export function SectionHeader({
  kicker,
  title,
  description,
  className = "",
  align = "left",
}: SectionHeaderProps) {
  const alignStyles = align === "center" ? "text-center mx-auto" : "";
  
  return (
    <div className={`max-w-2xl ${alignStyles} ${className}`}>
      {kicker && (
        <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
          <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
          {kicker}
        </p>
      )}
      <h2 className="heading-section text-3xl md:text-4xl text-balance mb-3">{title}</h2>
      {description && (
        <p className="text-ink-secondary text-base leading-relaxed text-pretty">{description}</p>
      )}
    </div>
  );
}
