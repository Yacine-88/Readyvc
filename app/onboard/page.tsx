"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Container } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { saveFounderProfile, isOnboarded } from "@/lib/onboard";

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
  const [form, setForm] = useState({
    name: "",
    email: "",
    startupName: "",
    country: "",
    sector: "",
    stage: "",
    hasRaisedBefore: null as boolean | null,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOnboarded()) {
      router.replace("/metrics");
    }
  }, [router]);

  function set(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const valid =
    form.name.trim() &&
    form.email.trim() &&
    form.startupName.trim() &&
    form.country.trim() &&
    form.sector &&
    form.stage &&
    form.hasRaisedBefore !== null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    saveFounderProfile({
      name: form.name.trim(),
      email: form.email.trim(),
      startupName: form.startupName.trim(),
      country: form.country.trim(),
      sector: form.sector,
      stage: form.stage,
      hasRaisedBefore: form.hasRaisedBefore!,
    });
    router.push("/metrics");
  }

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
              Takes 60 seconds. Your answers personalise the analysis and stay on your device.
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

            {/* Submit */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={!valid || submitting}
                className="w-full h-12 text-sm"
              >
                {submitting ? "Starting…" : "Start my analysis →"}
              </Button>
              <p className="text-xs text-muted text-center mt-3">
                No account needed. Data stays local.{" "}
                <Link href="/dashboard" className="underline hover:text-ink transition-colors">
                  Already did this? Go to dashboard →
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
