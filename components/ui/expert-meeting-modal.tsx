"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

const CALENDLY_URL = "https://calendly.com/vcready/30min";

interface ExpertMeetingModalProps {
  score: number;
  onClose: () => void;
}

export function ExpertMeetingModal({ score, onClose }: ExpertMeetingModalProps) {
  const router = useRouter();

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const verdictLabel =
    score >= 70 ? "investor-ready" : score >= 35 ? "on the right track" : "at an early stage";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-card border border-border rounded-[var(--radius-xl)] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-ink hover:bg-soft transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Score badge */}
        <div className="bg-soft border-b border-border px-6 py-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 border-accent flex items-center justify-center shrink-0">
            <span className="text-xl font-extrabold font-mono text-accent">{score}</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-muted mb-0.5">Your readiness score</p>
            <p className="text-sm font-bold text-ink">
              You&apos;re {verdictLabel}.
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <h2 className="text-xl font-extrabold tracking-tight text-ink mb-2 text-balance">
            Your analysis is ready. Now let&apos;s go deeper.
          </h2>
          <p className="text-sm text-ink-secondary leading-relaxed mb-6">
            Book a free 30-minute call with an expert. We&apos;ll walk through your score,
            identify the biggest gaps, and map out exactly what to do before your first
            investor meeting.
          </p>

          <div className="space-y-3">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 h-12 rounded-[var(--radius-md)] bg-ink text-white text-sm font-semibold hover:bg-black transition-colors"
            >
              Book a free 30-min call →
            </a>
            <button
              onClick={() => {
                onClose();
                router.push("/dashboard");
              }}
              className="flex w-full items-center justify-center h-11 rounded-[var(--radius-md)] border border-border text-sm font-semibold text-ink hover:border-ink/40 transition-colors"
            >
              View my dashboard
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5">
          <p className="text-[11px] text-muted text-center">
            No obligation. The call is free and tailored to your analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
