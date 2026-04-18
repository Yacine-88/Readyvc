"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Container } from "@/components/layout/section";
import { MatchResultsList } from "@/components/investors/match-results-list";
import {
  getSavedMatches,
  getStartupProfile,
  runMatching,
} from "@/lib/investors/api-client";
import { createClient } from "@/lib/supabase-client";
import { buildStartupContext } from "@/lib/investors/build-startup-context";
import type {
  MatchFilterState,
  MatchListItem,
  MatchSort,
  StartupProfileRecord,
} from "@/lib/investors/ui-types";
import {
  DEFAULT_MATCH_FILTERS,
  savedMatchToListItem,
} from "@/lib/investors/ui-types";

const SORT_OPTIONS: { value: MatchSort; label: string }[] = [
  { value: "fit_desc", label: "Best fit" },
  { value: "activity_desc", label: "Most active" },
  { value: "name_asc", label: "Name (A–Z)" },
];

const INPUT_CLASS =
  "h-10 rounded-[var(--radius-sm)] border border-border bg-card px-3 text-sm text-ink outline-none transition-colors focus:border-ink focus:ring-0";

function applyFilters(
  items: MatchListItem[],
  filters: MatchFilterState
): MatchListItem[] {
  let out = items.slice();
  if (filters.country) {
    const needle = filters.country.toLowerCase();
    out = out.filter((m) => (m.hq_country ?? "").toLowerCase().includes(needle));
  }
  if (filters.region) {
    const needle = filters.region.toLowerCase();
    out = out.filter((m) => (m.hq_region ?? "").toLowerCase().includes(needle));
  }
  if (filters.sector) {
    const needle = filters.sector.toLowerCase();
    out = out.filter((m) =>
      (m.breakdown.reasoning ?? "").toLowerCase().includes(needle)
    );
  }
  if (filters.stage) {
    const needle = filters.stage.toLowerCase();
    out = out.filter((m) =>
      (m.breakdown.reasoning ?? "").toLowerCase().includes(needle)
    );
  }

  if (filters.sort === "fit_desc") {
    out.sort((a, b) => b.breakdown.total - a.breakdown.total);
  } else if (filters.sort === "activity_desc") {
    out.sort((a, b) => b.breakdown.activity - a.breakdown.activity);
  } else if (filters.sort === "name_asc") {
    out.sort((a, b) => a.investor_name.localeCompare(b.investor_name));
  }

  return out;
}

export default function MatchResultsPage() {
  const params = useParams<{ startupProfileId: string }>();
  const startupProfileId = params.startupProfileId;

  const [profile, setProfile] = useState<StartupProfileRecord | null>(null);
  const [matches, setMatches] = useState<MatchListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [filters, setFilters] = useState<MatchFilterState>(
    DEFAULT_MATCH_FILTERS
  );

  const loadData = useCallback(async () => {
    if (!startupProfileId) return;
    setLoading(true);
    setError(null);
    setEmpty(false);
    try {
      const prof = await getStartupProfile(startupProfileId).catch(() => null);
      if (prof) setProfile(prof);
      try {
        const rows = await getSavedMatches(startupProfileId);
        setMatches(rows.map(savedMatchToListItem));
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        if (msg.toLowerCase().includes("no matches")) {
          setEmpty(true);
          setMatches([]);
        } else {
          throw e;
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load matches.");
    } finally {
      setLoading(false);
    }
  }, [startupProfileId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  async function handleRerun() {
    if (!startupProfileId || running) return;
    setRunning(true);
    setError(null);
    try {
      await runMatching({ startup_profile_id: startupProfileId, topK: 50 });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed.");
    } finally {
      setRunning(false);
    }
  }

  async function handleRerunFresh() {
    if (running) return;
    setRunning(true);
    setError(null);
    try {
      let userId: string | null = null;
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        userId = data?.user?.id ?? null;
      } catch {
        userId = null;
      }
      const build = await buildStartupContext(userId);
      if (!build.isUsable) {
        throw new Error(
          "We need at least a startup name and sector/stage/country to match. Refine your profile to continue."
        );
      }
      const res = await runMatching({
        startup_context: build.context,
        topK: 50,
      });
      const id = res.startup_profile_id;
      if (id && id !== startupProfileId) {
        window.location.href = `/investor-matching/results/${id}`;
        return;
      }
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Matching failed.");
    } finally {
      setRunning(false);
    }
  }

  const filtered = useMemo(() => applyFilters(matches, filters), [matches, filters]);

  return (
    <main className="py-8 md:py-12">
      <Container>
        {/* Profile summary header */}
        <div className="bg-ink text-white rounded-[var(--radius-lg)] p-6 md:p-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <p className="eyebrow text-white/60 mb-2">
                Your saved matches
              </p>
              <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-white text-balance">
                {profile?.startup_name ?? "Your startup"}
              </h1>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile?.stage && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/90 uppercase tracking-wide">
                    {profile.stage}
                  </span>
                )}
                {profile?.country && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/90 uppercase tracking-wide">
                    {profile.country}
                  </span>
                )}
                {(profile?.sectors ?? []).map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-white/10 text-[11px] font-semibold text-white/90"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/investor-matching/profile"
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-sm)] border border-white/30 bg-transparent text-white font-semibold text-sm transition-colors hover:bg-white/10 w-full sm:w-auto"
              >
                Update profile
              </Link>
              <button
                type="button"
                onClick={handleRerun}
                disabled={running}
                className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-sm)] bg-white text-ink font-semibold text-sm transition-colors hover:bg-white/90 disabled:opacity-60 disabled:pointer-events-none w-full sm:w-auto"
              >
                {running ? "Re-running…" : "Re-run matching"}
              </button>
            </div>
          </div>
        </div>

        {/* Filters + sort */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Region"
            value={filters.region}
            onChange={(e) =>
              setFilters((f) => ({ ...f, region: e.target.value }))
            }
            className={INPUT_CLASS}
            aria-label="Filter by region"
          />
          <input
            type="text"
            placeholder="Country"
            value={filters.country}
            onChange={(e) =>
              setFilters((f) => ({ ...f, country: e.target.value }))
            }
            className={INPUT_CLASS}
            aria-label="Filter by country"
          />
          <input
            type="text"
            placeholder="Sector"
            value={filters.sector}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sector: e.target.value }))
            }
            className={INPUT_CLASS}
            aria-label="Filter by sector"
          />
          <input
            type="text"
            placeholder="Stage"
            value={filters.stage}
            onChange={(e) =>
              setFilters((f) => ({ ...f, stage: e.target.value }))
            }
            className={INPUT_CLASS}
            aria-label="Filter by stage"
          />
          <select
            value={filters.sort}
            onChange={(e) =>
              setFilters((f) => ({ ...f, sort: e.target.value as MatchSort }))
            }
            className={`${INPUT_CLASS} cursor-pointer`}
            aria-label="Sort"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Body states */}
        <div className="mt-6">
          {error && (
            <div
              className="rounded-[var(--radius-sm)] bg-danger-soft border border-danger-border px-4 py-3 text-sm text-danger mb-4"
              role="alert"
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-28 bg-soft border border-border rounded-[var(--radius-lg)] animate-pulse"
                />
              ))}
            </div>
          ) : empty && matches.length === 0 ? (
            <div className="bg-card border border-border rounded-[var(--radius-lg)] p-8 text-center">
              <p className="text-sm text-muted mb-4">
                No matches yet. Run matching using your current data to see
                investor fit.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleRerunFresh}
                  disabled={running}
                  className="inline-flex items-center justify-center h-11 px-4 rounded-[var(--radius-sm)] bg-ink text-white font-semibold text-sm hover:bg-black disabled:opacity-60"
                >
                  {running ? "Running…" : "Run matching using your current data"}
                </button>
                <button
                  type="button"
                  onClick={handleRerun}
                  disabled={running}
                  className="inline-flex items-center justify-center h-11 px-4 rounded-[var(--radius-sm)] border border-border bg-card text-ink font-semibold text-sm hover:border-ink/30 disabled:opacity-60"
                >
                  Re-run this profile
                </button>
              </div>
            </div>
          ) : (
            <MatchResultsList
              matches={filtered}
              startupProfileId={startupProfileId}
            />
          )}
        </div>
      </Container>
    </main>
  );
}
