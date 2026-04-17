"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { StartupProfileFormValues } from "@/lib/investors/ui-types";
import { EMPTY_STARTUP_PROFILE_FORM } from "@/lib/investors/ui-types";

interface StartupProfileFormProps {
  initial?: StartupProfileFormValues;
  submitting?: boolean;
  submitLabel?: string;
  onSubmit: (values: StartupProfileFormValues) => Promise<void> | void;
}

const INPUT_CLASS =
  "h-11 w-full rounded-[var(--radius-sm)] border border-border-strong bg-card px-3.5 text-sm text-ink font-medium outline-none transition-colors focus:border-ink focus:ring-0";

const TEXTAREA_CLASS =
  "w-full min-h-[100px] rounded-[var(--radius-sm)] border border-border-strong bg-card px-3.5 py-3 text-sm text-ink font-medium outline-none transition-colors focus:border-ink focus:ring-0 resize-y";

const STAGE_OPTIONS = [
  { value: "", label: "Select stage" },
  { value: "Pre-Seed", label: "Pre-Seed" },
  { value: "Seed", label: "Seed" },
  { value: "Series A", label: "Series A" },
  { value: "Growth", label: "Growth" },
];

function Label({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="eyebrow block">
      {children}
      {required && <span className="ml-1 text-danger">*</span>}
    </label>
  );
}

function ChipsInput({
  id,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter((x) => x.length > 0);
    if (parts.length === 0) return;
    const merged = [...value];
    for (const p of parts) {
      if (!merged.some((m) => m.toLowerCase() === p.toLowerCase())) {
        merged.push(p);
      }
    }
    onChange(merged);
    setDraft("");
  }

  function remove(idx: number) {
    const next = value.slice();
    next.splice(idx, 1);
    onChange(next);
  }

  return (
    <div className="rounded-[var(--radius-sm)] border border-border-strong bg-card px-2.5 py-2 focus-within:border-ink transition-colors">
      <div className="flex flex-wrap gap-1.5 items-center">
        {value.map((v, i) => (
          <span
            key={`${v}-${i}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-soft border border-border text-xs font-semibold text-ink"
          >
            {v}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-muted hover:text-ink"
              aria-label={`Remove ${v}`}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
          </span>
        ))}
        <input
          id={id}
          type="text"
          value={draft}
          placeholder={value.length === 0 ? placeholder : ""}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit(draft);
            } else if (e.key === "Backspace" && !draft && value.length > 0) {
              remove(value.length - 1);
            }
          }}
          onBlur={() => {
            if (draft.trim()) commit(draft);
          }}
          className="flex-1 min-w-[120px] h-8 bg-transparent px-1 text-sm text-ink font-medium outline-none"
        />
      </div>
    </div>
  );
}

export function StartupProfileForm({
  initial,
  submitting = false,
  submitLabel = "Continue",
  onSubmit,
}: StartupProfileFormProps) {
  const [values, setValues] = useState<StartupProfileFormValues>(
    initial ?? EMPTY_STARTUP_PROFILE_FORM
  );
  const [errors, setErrors] = useState<Partial<Record<keyof StartupProfileFormValues, string>>>(
    {}
  );

  function set<K extends keyof StartupProfileFormValues>(
    key: K,
    val: StartupProfileFormValues[K]
  ) {
    setValues((v) => ({ ...v, [key]: val }));
  }

  function validate(): boolean {
    const next: Partial<Record<keyof StartupProfileFormValues, string>> = {};
    if (!values.startup_name.trim()) {
      next.startup_name = "Startup name is required.";
    }
    if (values.fundraising_target_usd) {
      const n = Number(values.fundraising_target_usd);
      if (!Number.isFinite(n) || n < 0) {
        next.fundraising_target_usd = "Must be a non-negative number.";
      }
    }
    if (values.valuation_estimate) {
      const n = Number(values.valuation_estimate);
      if (!Number.isFinite(n) || n < 0) {
        next.valuation_estimate = "Must be a non-negative number.";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
      {/* Row 1: Name + description */}
      <div className="grid grid-cols-1 gap-4">
        <div>
          <Label htmlFor="startup_name" required>
            Startup name
          </Label>
          <input
            id="startup_name"
            type="text"
            value={values.startup_name}
            onChange={(e) => set("startup_name", e.target.value)}
            placeholder="Acme Inc."
            className={`${INPUT_CLASS} mt-1.5`}
            autoComplete="organization"
            required
          />
          {errors.startup_name && (
            <p className="text-[11px] text-danger mt-1">
              {errors.startup_name}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="description">One-line description</Label>
          <textarea
            id="description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What do you do? Who do you serve?"
            className={`${TEXTAREA_CLASS} mt-1.5`}
          />
        </div>
      </div>

      {/* Row 2: Country + region */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">Country</Label>
          <input
            id="country"
            type="text"
            value={values.country}
            onChange={(e) => set("country", e.target.value)}
            placeholder="e.g. France"
            className={`${INPUT_CLASS} mt-1.5`}
            autoComplete="country-name"
          />
        </div>
        <div>
          <Label htmlFor="region">Region</Label>
          <input
            id="region"
            type="text"
            value={values.region}
            onChange={(e) => set("region", e.target.value)}
            placeholder="e.g. Europe"
            className={`${INPUT_CLASS} mt-1.5`}
          />
        </div>
      </div>

      {/* Row 3: Stage + business model */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="stage">Stage</Label>
          <select
            id="stage"
            value={values.stage}
            onChange={(e) => set("stage", e.target.value)}
            className={`${INPUT_CLASS} mt-1.5 cursor-pointer appearance-none`}
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="business_model">Business model</Label>
          <input
            id="business_model"
            type="text"
            value={values.business_model}
            onChange={(e) => set("business_model", e.target.value)}
            placeholder="e.g. B2B SaaS"
            className={`${INPUT_CLASS} mt-1.5`}
          />
        </div>
      </div>

      {/* Row 4: Sectors chips */}
      <div>
        <Label htmlFor="sectors">Sectors</Label>
        <div className="mt-1.5">
          <ChipsInput
            id="sectors"
            value={values.sectors}
            onChange={(next) => set("sectors", next)}
            placeholder="e.g. Fintech, SaaS (press Enter or comma)"
          />
        </div>
      </div>

      {/* Row 5: Target markets chips */}
      <div>
        <Label htmlFor="target_markets">Target markets</Label>
        <div className="mt-1.5">
          <ChipsInput
            id="target_markets"
            value={values.target_markets}
            onChange={(next) => set("target_markets", next)}
            placeholder="e.g. France, Morocco"
          />
        </div>
      </div>

      {/* Row 6: Fundraising target + valuation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="fundraising_target_usd">Fundraising target</Label>
          <div className="relative mt-1.5">
            <input
              id="fundraising_target_usd"
              type="number"
              inputMode="decimal"
              min={0}
              value={values.fundraising_target_usd}
              onChange={(e) =>
                set("fundraising_target_usd", e.target.value)
              }
              placeholder="0"
              className={`${INPUT_CLASS} pr-14`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
              USD
            </span>
          </div>
          {errors.fundraising_target_usd && (
            <p className="text-[11px] text-danger mt-1">
              {errors.fundraising_target_usd}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="valuation_estimate">Valuation estimate</Label>
          <div className="relative mt-1.5">
            <input
              id="valuation_estimate"
              type="number"
              inputMode="decimal"
              min={0}
              value={values.valuation_estimate}
              onChange={(e) => set("valuation_estimate", e.target.value)}
              placeholder="0"
              className={`${INPUT_CLASS} pr-14`}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted">
              USD
            </span>
          </div>
          {errors.valuation_estimate && (
            <p className="text-[11px] text-danger mt-1">
              {errors.valuation_estimate}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row-reverse gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-[var(--radius-sm)] bg-ink text-white font-semibold text-sm transition-colors hover:bg-black disabled:opacity-50 disabled:pointer-events-none w-full sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          {submitting ? "Analyzing investors…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
