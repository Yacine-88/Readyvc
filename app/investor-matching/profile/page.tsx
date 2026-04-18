"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { Container } from "@/components/layout/section";
import { StartupProfileForm } from "@/components/investors/startup-profile-form";
import { createClient } from "@/lib/supabase-client";
import { runMatching } from "@/lib/investors/api-client";
import {
  EMPTY_STARTUP_PROFILE_FORM,
  formValuesFromStartupContext,
  contextFromFormValues,
  type StartupProfileFormValues,
} from "@/lib/investors/ui-types";
import { buildStartupContext } from "@/lib/investors/build-startup-context";

export default function StartupProfilePage() {
  const router = useRouter();
  const [initial, setInitial] = useState<StartupProfileFormValues | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [prefillSources, setPrefillSources] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let userId: string | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch {
        userId = null;
      }
      const build = await buildStartupContext(userId);
      if (cancelled) return;
      setUserId(userId);
      if (build.context.startup_name) {
        setInitial(formValuesFromStartupContext(build.context));
        const labels: string[] = [];
        if (build.sources.founder) labels.push("onboarding");
        if (build.sources.valuation) labels.push("Valuation");
        if (build.sources.metrics) labels.push("Metrics");
        if (build.sources.profile) labels.push("saved profile");
        setPrefillSources(labels);
      } else {
        setInitial(EMPTY_STARTUP_PROFILE_FORM);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(values: StartupProfileFormValues) {
    setError(null);
    setSubmitting(true);
    try {
      setStatus("Saving your profile…");
      const ctx = contextFromFormValues(values, { user_id: userId });
      if (!ctx.startup_name) {
        throw new Error("Please add a startup name before running matching.");
      }
      setStatus("Analyzing investors against your profile…");
      const res = await runMatching({ startup_context: ctx, topK: 50 });
      const id = res.startup_profile_id;
      if (!id) throw new Error("Matching succeeded but no profile id was returned.");
      router.push(`/investor-matching/results/${id}`);
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

        <p className="eyebrow mb-3">Investor matching · Optional</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-ink text-balance">
          Refine your profile
        </h1>
        <p className="mt-3 text-base text-ink-secondary leading-relaxed max-w-xl">
          Matching is already powered by your existing tools. Tweak any field
          below to sharpen the ranking, then re-run.
        </p>

        {prefillSources.length > 0 && (
          <div
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-soft px-3 py-1.5 text-xs font-semibold text-ink"
            aria-live="polite"
          >
            <Check className="h-3.5 w-3.5 text-success" aria-hidden="true" />
            Pre-filled from {prefillSources.join(" + ")}
          </div>
        )}

        <div className="mt-8 bg-card border border-border rounded-[var(--radius-lg)] p-5 md:p-8">
          {initial === null ? (
            <div className="h-40 rounded-[var(--radius-sm)] bg-soft animate-pulse" />
          ) : (
            <StartupProfileForm
              initial={initial}
              submitting={submitting}
              submitLabel="Save & run matching"
              onSubmit={handleSubmit}
            />
          )}
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
