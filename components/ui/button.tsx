import Link from "next/link";
import { forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: React.ReactNode;
}

interface ButtonAsButton extends ButtonBaseProps {
  href?: never;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
}

interface ButtonAsLink extends ButtonBaseProps {
  href: string;
  onClick?: never;
  type?: never;
  disabled?: never;
  target?: string;
  rel?: string;
}

type ButtonProps = ButtonAsButton | ButtonAsLink;

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-ink text-white border-transparent hover:bg-black",
  secondary:
    "bg-card text-ink border-border-strong hover:border-ink",
  ghost:
    "bg-transparent text-muted border-border hover:text-ink hover:border-ink",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-5 text-sm",
};

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  function Button(props, ref) {
    const {
      variant = "primary",
      size = "md",
      className = "",
      children,
      ...rest
    } = props;

    const baseStyles =
      "inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-sm)] border transition-all duration-150 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2";

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

    if ("href" in rest && rest.href) {
      const linkProps = rest as ButtonAsLink;
      const isExternal = linkProps.target === "_blank";
      
      if (isExternal) {
        return (
          <a
            href={linkProps.href}
            target={linkProps.target}
            rel={linkProps.rel}
            className={combinedClassName}
            ref={ref as React.Ref<HTMLAnchorElement>}
          >
            {children}
          </a>
        );
      }
      
      return (
        <Link
          href={linkProps.href}
          className={combinedClassName}
          ref={ref as React.Ref<HTMLAnchorElement>}
        >
          {children}
        </Link>
      );
    }

    const buttonProps = rest as ButtonAsButton;
    return (
      <button
        type={buttonProps.type || "button"}
        onClick={buttonProps.onClick}
        disabled={buttonProps.disabled}
        className={`${combinedClassName} disabled:opacity-50 disabled:pointer-events-none`}
        ref={ref as React.Ref<HTMLButtonElement>}
      >
        {children}
      </button>
    );
  }
);
