"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Container } from "@/components/layout/section";
import { InvestorDetailPanel } from "@/components/investors/investor-detail-panel";
import {
  getInvestor,
  getSavedMatches,
} from "@/lib/investors/api-client";
import type {
  InvestorDetailPayload,
  MatchListItem,
} from "@/lib/investors/ui-types";
import { savedMatchToListItem } from "@/lib/investors/ui-types";

function InvestorDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const id = params.id;
  const from = searchParams?.get("from");
  const profileId = searchParams?.get("profileId");

  const [payload, setPayload] = useState<InvestorDetailPayload | null>(null);
  const [matchCallout, setMatchCallout] = useState<MatchListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getInvestor(id);
      setPayload(p);
      if (from === "match" && profileId) {
        try {
          const rows = await getSavedMatches(profileId);
          const row = rows.find((r) => r.investor_id === id);
          if (row) setMatchCallout(savedMatchToListItem(row));
        } catch {
          // non-fatal
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load investor.");
    } finally {
      setLoading(false);
    }
  }, [id, from, profileId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <main className="py-8 md:py-12">
      <Container>
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={
              profileId
                ? `/investor-matching/results/${profileId}`
                : "/investors"
            }
            className="text-xs font-semibold text-muted hover:text-ink transition-colors"
          >
            ← {profileId ? "Back to matches" : "Back to investors"}
          </Link>
        </div>

        {error && (
          <div
            className="rounded-[var(--radius-sm)] bg-danger-soft border border-danger-border px-4 py-3 text-sm text-danger mb-4"
            role="alert"
          >
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-4">
            <div className="h-48 bg-soft rounded-[var(--radius-lg)] animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-64 bg-soft rounded-[var(--radius-lg)] animate-pulse" />
              <div className="h-64 bg-soft rounded-[var(--radius-lg)] animate-pulse" />
            </div>
          </div>
        ) : payload ? (
          <InvestorDetailPanel payload={payload} matchCallout={matchCallout} />
        ) : null}
      </Container>
    </main>
  );
}

export default function InvestorDetailPage() {
  return (
    <Suspense
      fallback={
        <main className="py-8 md:py-12">
          <Container>
            <div className="h-48 bg-soft rounded-[var(--radius-lg)] animate-pulse" />
          </Container>
        </main>
      }
    >
      <InvestorDetailInner />
    </Suspense>
  );
}
