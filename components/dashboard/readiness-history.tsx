"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getReadinessHistory, type ReadinessSnapshot } from "@/lib/local-readiness";
import { getHistoryFromDB } from "@/lib/db-history";
import { syncAllToolsToLocalStorage } from "@/lib/db-tools";

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ScoreDelta({ current, prev }: { current: number; prev: number | undefined }) {
  if (prev === undefined) return null;
  const delta = current - prev;
  if (delta === 0) return <span className="text-xs text-muted">—</span>;
  return (
    <span className={`text-xs font-semibold ${delta > 0 ? "text-success" : "text-danger"}`}>
      {delta > 0 ? "+" : ""}{delta}
    </span>
  );
}

export function ReadinessHistory() {
  const [history, setHistory] = useState<ReadinessSnapshot[]>([]);

  useEffect(() => {
    async function load() {
      // Sync DB data to localStorage first (cross-device support)
      await syncAllToolsToLocalStorage();

      // Merge local + DB history, dedupe by timestamp, sort newest first
      const local = getReadinessHistory();
      const db = await getHistoryFromDB();

      const all = [...local, ...db];
      const seen = new Set<string>();
      const merged = all
        .filter((s) => {
          const key = s.timestamp;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setHistory(merged);
    }
    load();
  }, []);

  if (history.length === 0) return null;

  return (
    <Card padding="sm">
      <CardHeader>
        <CardTitle kicker="Progress">Score history</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {history.slice(0, 8).map((snap, i) => {
            const prev = history[i + 1]; // older entry (reversed list)
            return (
              <div
                key={snap.timestamp}
                className="flex items-center gap-3 py-2 border-b border-border last:border-0"
              >
                {/* Score */}
                <span className="text-2xl font-extrabold font-mono tracking-tight w-12 shrink-0">
                  {snap.overall_score}
                </span>

                {/* Delta */}
                <div className="w-8 shrink-0">
                  <ScoreDelta current={snap.overall_score} prev={prev?.overall_score} />
                </div>

                {/* Mini bar */}
                <div className="flex-1 h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${snap.overall_score}%` }}
                  />
                </div>

                {/* Date */}
                <span className="text-xs text-muted shrink-0 hidden sm:block">
                  {fmtDate(snap.timestamp)}
                </span>
              </div>
            );
          })}
        </div>

        {history.length > 1 && (
          <p className="text-xs text-muted mt-3">
            {history.length} saves recorded.{" "}
            {history[0].overall_score > history[history.length - 1].overall_score
              ? `Score improved +${history[0].overall_score - history[history.length - 1].overall_score} pts overall.`
              : "Keep completing tools to improve your score."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
