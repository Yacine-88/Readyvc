interface LogoProps {
  variant?: "dark" | "light";
  className?: string;
}

export function Logo({ variant = "dark", className = "" }: LogoProps) {
  const fillColor = variant === "dark" ? "#0E0E0C" : "#FFFFFF";
  
  return (
    <svg
      viewBox="0 0 140 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VCReady"
    >
      {/* Box with VC */}
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="3"
        stroke={fillColor}
        strokeWidth="2"
        fill="none"
      />
      {/* V */}
      <text
        x="8"
        y="22"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill={fillColor}
        letterSpacing="-0.5"
      >
        VC
      </text>
      {/* Ready text */}
      <text
        x="40"
        y="22"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="18"
        fontWeight="600"
        fill={fillColor}
        letterSpacing="-0.5"
      >
        Ready
      </text>
    </svg>
  );
}

export function LogoMark({ variant = "dark", className = "" }: LogoProps) {
  const fillColor = variant === "dark" ? "#0E0E0C" : "#FFFFFF";
  
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="VC"
    >
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="3"
        stroke={fillColor}
        strokeWidth="2"
        fill="none"
      />
      <text
        x="8"
        y="22"
        fontFamily="var(--font-sans), system-ui, sans-serif"
        fontSize="14"
        fontWeight="600"
        fill={fillColor}
        letterSpacing="-0.5"
      >
        VC
      </text>
    </svg>
  );
}
