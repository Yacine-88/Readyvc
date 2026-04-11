"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { isOnboarded } from "@/lib/onboard";
import { saveProfileToDB } from "@/lib/db-user";
import { useAuth } from "@/lib/auth-context";

const SECTORS = [
  "SaaS",
  "Fintech",
  "Healthtech",
  "Edtech",
  "E-commerce",
  "Marketplace",
  "DeepTech",
  "Cleantech",
  "Consumer",
  "Other",
];

const STAGES = ["Pre-seed", "Seed", "Series A", "Series B+"];

export default function OnboardPage() {
  const router = useRouter();
  const { signUp, signIn, user, loading } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    startupName: "",
    country: "",
    sector: "",
    stage: "",
    hasRaisedBefore: null as boolean | null,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already onboarded (and authenticated), go straight to dashboard
  useEffect(() => {
    if (!loading && user && isOnboarded()) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const valid =
    form.name.trim() &&
    form.email.trim() &&
    form.password.length >= 8 &&
    form.startupName.trim() &&
    form.country.trim() &&
    form.sector &&
    form.stage &&
    form.hasRaisedBefore !== null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setError(null);
    setSubmitting(true);

    // 1. Attempt Supabase signup (best effort — no-op if Supabase not configured)
    const { error: authError } = await signUp(form.email.trim(), form.password);
    if (authError && !authError.includes("already registered")) {
      setError(authError);
      setSubmitting(false);
      return;
    }

    // If user already exists with that email, direct them to login
    if (authError && authError.includes("already registered")) {
      setError("An account with this email already exists. Sign in instead.");
      setSubmitting(false);
      return;
    }

    // 1b. Auto-login after signup so saveProfileToDB has a session to write to DB.
    // Without this, signUp returns session: null when email confirmation is pending,
    // and the DB profile write is silently skipped (login later would fail to sync).
    const { error: signInError } = await signIn(form.email.trim(), form.password);
    if (signInError) {
      // This will fail if email confirmation is still enabled in Supabase.
      // Fix: Supabase Dashboard → Authentication → Settings → disable "Enable email confirmations".
      setError(`Account created but sign-in failed: ${signInError}. Check your email to confirm your account, then sign in.`);
      setSubmitting(false);
      return;
    }

    // 2. Save profile to localStorage + DB
    const profileData = {
      name: form.name.trim(),
      email: form.email.trim(),
      startupName: form.startupName.trim(),
      country: form.country.trim(),
      sector: form.sector,
      stage: form.stage,
      hasRaisedBefore: form.hasRaisedBefore!,
    };
    await saveProfileToDB(profileData);

    router.push("/metrics");
  }

  if (loading) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col justify-center py-12">
      <Container narrow>
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="eyebrow inline-flex items-center gap-2.5 mb-4">
              <span className="w-5 h-px bg-border-strong" aria-hidden="true" />
              Getting started
            </p>
            <h1 className="heading-display text-2xl sm:text-3xl md:text-4xl text-balance mb-3">
              Tell us about your startup.
            </h1>
            <p className="text-ink-secondary text-base leading-relaxed">
              Takes 60 seconds. Create a free account to save your progress across devices.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Full name"
                type="text"
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="Jane Smith"
              />
              <Field
                label="Email"
                type="email"
                value={form.email}
                onChange={(v) => set("email", v)}
                placeholder="jane@startup.com"
              />
            </div>

            {/* Password */}
            <Field
              label="Password (min. 8 characters)"
              type="password"
              value={form.password}
              onChange={(v) => set("password", v)}
              placeholder="••••••••"
            />

            {/* Startup + Country */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Field
                label="Startup name"
                type="text"
                value={form.startupName}
                onChange={(v) => set("startupName", v)}
                placeholder="Acme Inc."
              />
              <Field
                label="Country"
                type="text"
                value={form.country}
                onChange={(v) => set("country", v)}
                placeholder="France"
              />
            </div>

            {/* Sector + Stage */}
            <div className="grid sm:grid-cols-2 gap-4">
              <SelectField
                label="Sector"
                value={form.sector}
                onChange={(v) => set("sector", v)}
                options={SECTORS}
                placeholder="Select sector"
              />
              <SelectField
                label="Stage"
                value={form.stage}
                onChange={(v) => set("stage", v)}
                options={STAGES}
                placeholder="Select stage"
              />
            </div>

            {/* Raised before */}
            <div>
              <p className="text-sm font-semibold text-ink mb-3">
                Have you raised funding before?
              </p>
              <div className="flex gap-3">
                <RadioButton
                  label="Yes"
                  selected={form.hasRaisedBefore === true}
                  onClick={() => set("hasRaisedBefore", true)}
                />
                <RadioButton
                  label="No, first time"
                  selected={form.hasRaisedBefore === false}
                  onClick={() => set("hasRaisedBefore", false)}
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-danger font-medium bg-danger/10 border border-danger/20 rounded-[var(--radius-md)] px-3 py-2">
                {error}{" "}
                {error.includes("already exists") && (
                  <Link href="/auth/login" className="underline font-bold">
                    Sign in →
                  </Link>
                )}
              </div>
            )}

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={!valid || submitting}
                className="w-full h-12 text-sm"
              >
                {submitting ? "Creating account…" : "Start my analysis →"}
              </Button>
              <p className="text-xs text-muted text-center mt-3">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline hover:text-ink transition-colors">
                  Sign in →
                </Link>
              </p>
            </div>
          </form>
        </div>
      </Container>
    </div>
  );
}

// ─── Form primitives ──────────────────────────────────────────────────────────

const INPUT_BASE =
  "w-full h-12 px-4 text-sm bg-card border border-border rounded-[var(--radius-md)] " +
  "text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 " +
  "focus:border-accent/50 transition-colors";

function Field({
  label,
  type,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_BASE}
        autoComplete="off"
      />
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_BASE} appearance-none cursor-pointer`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function RadioButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 h-12 rounded-[var(--radius-md)] border text-sm font-semibold transition-all ${
        selected
          ? "bg-ink text-white border-ink"
          : "bg-card text-ink border-border hover:border-ink/40"
      }`}
    >
      {label}
    </button>
  );
}
