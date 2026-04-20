"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { StartupProfileForm } from "@/components/investors/startup-profile-form";
import {
  createStartupProfile,
  runMatching,
} from "@/lib/investors/api-client";
import type { StartupProfileFormValues } from "@/lib/investors/ui-types";
import type { StartupProfileInput } from "@/lib/investors/types";

function toStartupProfileInput(
  v: StartupProfileFormValues
): StartupProfileInput {
  const parseNum = (s: string): number | null => {
    if (!s.trim()) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  return {
    startup_name: v.startup_name.trim(),
    description: v.description.trim() || null,
    country: v.country.trim() || null,
    region: v.region.trim() || null,
    stage: v.stage.trim() || null,
    sectors: v.sectors.length > 0 ? v.sectors : null,
    business_model: v.business_model.trim() || null,
    target_markets: v.target_markets.length > 0 ? v.target_markets : null,
    fundraising_target_usd: parseNum(v.fundraising_target_usd),
    valuation_estimate: parseNum(v.valuation_estimate),
  };
}

export default function StartupProfilePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: StartupProfileFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      const input = toStartupProfileInput(values);

      setStatus("Saving your profile…");
      const profile = await createStartupProfile(input);

      setStatus("Analyzing investors against your profile…");
      const { startup_profile_id: ephemeralId } = await runMatching({
        profile: input,
      });

      const targetId = ephemeralId ?? profile.id;
      router.push(`/investor-matching/results/${targetId}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      setStatus(null);
      setSubmitting(false);
    }
  }

  return (
    <main className="py-10 md:py-16">
      <Container narrow>
        <div className="mb-6">
          <Link
            href="/investor-matching"
            className="text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            ← Back to Investor Matching
          </Link>
        </div>

        <p className="eyebrow mb-3">Investor matching · Step 1</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-ink text-balance">
          Tell us about your company
        </h1>
        <p className="mt-3 text-base text-ink-secondary leading-relaxed max-w-xl">
          We use this to score investor fit. You can update it later.
        </p>

        <div className="mt-8 bg-card border border-border rounded-[var(--radius-lg)] p-5 md:p-8">
          <StartupProfileForm
            submitting={submitting}
            submitLabel="Run matching"
            onSubmit={handleSubmit}
          />
          {submitting && status && (
            <div
              className="mt-6 rounded-[var(--radius-sm)] bg-soft border border-border px-4 py-3 text-sm text-ink"
              aria-live="polite"
            >
              {status}
            </div>
          )}
          {error && (
            <div
              className="mt-6 rounded-[var(--radius-sm)] bg-danger-soft border border-danger-border px-4 py-3 text-sm text-danger"
              role="alert"
            >
              {error}
            </div>
          )}
        </div>
      </Container>
    </main>
  );
}
