"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/section";
import { InvestorFilters } from "@/components/investors/investor-filters";
import { InvestorCard } from "@/components/investors/investor-card";
import { listInvestors } from "@/lib/investors/api-client";
import type {
  InvestorFilterState,
  InvestorListRow,
  InvestorSort,
  InvestorsListResponse,
} from "@/lib/investors/ui-types";
import { DEFAULT_INVESTOR_FILTERS } from "@/lib/investors/ui-types";

function stateFromParams(params: URLSearchParams): InvestorFilterState {
  const sortRaw = params.get("sort") ?? DEFAULT_INVESTOR_FILTERS.sort;
  const sort: InvestorSort =
    sortRaw === "name_asc" || sortRaw === "deals_desc"
      ? sortRaw
      : "activity_desc";
  const pageRaw = Number(params.get("page") ?? "1");
  const pageSizeRaw = Number(params.get("pageSize") ?? "25");
  return {
    search: params.get("search") ?? "",
    region: params.get("region") ?? "",
    country: params.get("country") ?? "",
    sector: params.get("sector") ?? "",
    stage: params.get("stage") ?? "",
    minActivity: params.get("minActivity") ?? "",
    sort,
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1,
    pageSize:
      Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
        ? Math.floor(pageSizeRaw)
        : 25,
  };
}

function stateToParams(state: InvestorFilterState): string {
  const qs = new URLSearchParams();
  if (state.search) qs.set("search", state.search);
  if (state.region) qs.set("region", state.region);
  if (state.country) qs.set("country", state.country);
  if (state.sector) qs.set("sector", state.sector);
  if (state.stage) qs.set("stage", state.stage);
  if (state.minActivity) qs.set("minActivity", state.minActivity);
  if (state.sort !== DEFAULT_INVESTOR_FILTERS.sort) qs.set("sort", state.sort);
  if (state.page > 1) qs.set("page", String(state.page));
  if (state.pageSize !== DEFAULT_INVESTOR_FILTERS.pageSize) {
    qs.set("pageSize", String(state.pageSize));
  }
  return qs.toString();
}

function InvestorsPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<InvestorFilterState>(() =>
    stateFromParams(new URLSearchParams(searchParams?.toString() ?? ""))
  );
  const [data, setData] = useState<InvestorsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync filters -> URL
  useEffect(() => {
    const qs = stateToParams(filters);
    const current = searchParams?.toString() ?? "";
    if (qs !== current) {
      router.replace(`/investors${qs ? `?${qs}` : ""}`, { scroll: false });
    }
  }, [filters, router, searchParams]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const minActivityNum =
        filters.minActivity && filters.minActivity.trim() !== ""
          ? Number(filters.minActivity)
          : undefined;
      const res = await listInvestors({
        search: filters.search || undefined,
        region: filters.region || undefined,
        country: filters.country || undefined,
        sector: filters.sector || undefined,
        stage: filters.stage || undefined,
        minActivity: Number.isFinite(minActivityNum)
          ? minActivityNum
          : undefined,
        page: filters.page,
        pageSize: filters.pageSize,
        sort: filters.sort,
      });
      setData(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load investors.");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const rows: InvestorListRow[] = data?.rows ?? [];

  return (
    <main className="py-8 md:py-12">
      <Container>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="eyebrow mb-2">Investor directory</p>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl leading-tight text-ink text-balance">
              Browse investors
            </h1>
            <p className="mt-2 text-sm text-ink-secondary max-w-2xl">
              Search and filter thousands of investors by geography, sector,
              stage, and activity.
            </p>
          </div>
          <Link
            href="/investor-matching/profile"
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[var(--radius-sm)] bg-ink text-white font-semibold text-sm hover:bg-black w-full sm:w-auto"
          >
            Match to my startup
          </Link>
        </div>

        <InvestorFilters
          value={filters}
          onChange={(next) => setFilters(next)}
        />

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-36 bg-soft border border-border rounded-[var(--radius-lg)] animate-pulse"
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="bg-card border border-border rounded-[var(--radius-lg)] p-8 text-center">
              <p className="text-sm text-muted">
                No investors match these filters. Try broadening the search.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3 text-xs text-muted">
                <span>
                  <span className="font-mono tabular-nums text-ink font-semibold">
                    {data?.total ?? rows.length}
                  </span>{" "}
                  investors
                </span>
                <span>
                  Page{" "}
                  <span className="font-mono tabular-nums">
                    {filters.page}
                  </span>{" "}
                  /{" "}
                  <span className="font-mono tabular-nums">{totalPages}</span>
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {rows.map((r) => (
                  <InvestorCard key={r.id} row={r} />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    disabled={filters.page <= 1}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page - 1 }))
                    }
                    className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-sm)] border border-border bg-card text-sm font-semibold text-ink hover:border-ink disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={filters.page >= totalPages}
                    onClick={() =>
                      setFilters((f) => ({ ...f, page: f.page + 1 }))
                    }
                    className="inline-flex items-center justify-center h-10 px-4 rounded-[var(--radius-sm)] border border-border bg-card text-sm font-semibold text-ink hover:border-ink disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </main>
  );
}

export default function InvestorsPage() {
  return (
    <Suspense
      fallback={
        <main className="py-8 md:py-12">
          <Container>
            <div className="h-10 bg-soft rounded animate-pulse w-64" />
          </Container>
        </main>
      }
    >
      <InvestorsPageInner />
    </Suspense>
  );
}
