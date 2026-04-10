"use client";

import { useRef, useEffect, useState } from "react";

/**
 * Parses a value string like "72", "100+", "$4.2M", "+24%", "14 mo"
 * Returns { prefix, num, suffix } for animation.
 */
function parse(v: string): { prefix: string; num: number; suffix: string } {
  const match = v.match(/^([^0-9]*)(\d+(?:\.\d+)?)(.*)$/);
  if (!match) return { prefix: "", num: 0, suffix: v };
  return { prefix: match[1], num: parseFloat(match[2]), suffix: match[3] };
}

interface AnimatedNumberProps {
  value: string;
  className?: string;
  duration?: number; // ms, default 1000
}

export function AnimatedNumber({ value, className, duration = 1000 }: AnimatedNumberProps) {
  const { prefix, num, suffix } = parse(value);
  const [display, setDisplay] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();

          function tick(now: number) {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(num * eased);
            if (progress < 1) requestAnimationFrame(tick);
          }

          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.4 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [num, duration]);

  // Format: keep one decimal if original had one, else integer
  const isDecimal = String(num).includes(".");
  const formatted = isDecimal ? display.toFixed(1) : String(Math.round(display));

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
