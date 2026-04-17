/**
 * Import deals from the "Africa — The Big Deal" Excel workbook.
 *
 * Usage:
 *   npx tsx scripts/import-africa-deals.ts [path-to-xlsx]
 *
 * Default path: data/africa-big-deal.xlsx
 *
 * Idempotency:
 *   - deals upsert on (source, normalized_company_name, announced_at, round_type)
 *   - deal_investors upsert on (deal_id, normalized_investor_name_raw)
 *
 * Linking:
 *   Deal-investor rows are linked to `investors` ONLY via exact normalized
 *   name match against investors previously imported for the same source.
 *   No fuzzy matching at this stage — unmatched names are preserved raw.
 */

import path from "node:path";
import * as XLSX from "xlsx";

import { getSupabaseAdmin } from "../lib/supabase/admin.js";
import {
  DEAL_HEADER_ALIASES,
  resolveHeaders,
  type DealCol,
} from "../lib/investors/header-mapping.js";
import {
  finishImportRun,
  logInfo,
  logWarn,
  recordIssue,
  startImportRun,
} from "../lib/investors/import-logging.js";
import {
  normalizeName,
  normalizeText,
  parseDate,
  parseNumeric,
  splitInvestorList,
} from "../lib/investors/normalization.js";
import type {
  DealInsert,
  DealInvestorInsert,
  Json,
} from "../lib/investors/import-types.js";

const SOURCE = "africa_big_deal_2019_2023";
const SHEET_NAME = "Deals 2019-2023";
const TAG = "import-africa-deals";

async function main(): Promise<void> {
  const filePath =
    process.argv[2] ?? path.resolve(process.cwd(), "data/africa-big-deal.xlsx");
  logInfo(TAG, `Reading workbook: ${filePath}`);

  const wb = XLSX.readFile(filePath, { cellDates: true });
  const sheet = wb.Sheets[SHEET_NAME];
  if (!sheet) {
    throw new Error(
      `Sheet "${SHEET_NAME}" not found. Available sheets: ${wb.SheetNames.join(
        ", "
      )}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: false,
  });
  if (rows.length < 2) throw new Error(`Sheet "${SHEET_NAME}" has no data.`);

  const [headerRow, ...dataRows] = rows;
  const cols = resolveHeaders<DealCol>(headerRow, DEAL_HEADER_ALIASES);

  if (cols.company_name === undefined) {
    throw new Error(`Missing required column "Start-up name" in "${SHEET_NAME}".`);
  }

  const client = getSupabaseAdmin();

  // Build the investor-name → id lookup for exact normalized matching.
  const investorLookup = await buildInvestorLookup(client);
  logInfo(TAG, `loaded ${investorLookup.size} known investors for matching`);

  const run = await startImportRun(client, {
    importType: "deals",
    source: SOURCE,
    fileName: path.basename(filePath),
  });

  let rowsRead = 0;
  let rowsSkipped = 0;
  let rowsUpserted = 0;
  let investorLinks = 0;
  let exactMatches = 0;
  let unmatched = 0;

  try {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      rowsRead++;

      const rawCompany = pick(row, cols.company_name);
      const companyClean = normalizeText(rawCompany);
      if (!companyClean) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2,
          reason: "missing company name",
        });
        continue;
      }
      const normalizedCompany = normalizeName(companyClean);
      if (!normalizedCompany) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2,
          reason: "company normalizes to empty",
          raw: companyClean as Json,
        });
        continue;
      }

      const announcedAt =
        parseDate(pick(row, cols.deal_date)) ??
        parseDate(pick(row, cols.deal_year));

      const amountMRaw = pick(row, cols.amount_raised_m);
      const amountM = parseNumeric(amountMRaw);
      const amountUsd = amountM !== null ? amountM * 1_000_000 : null;

      const roundType = normalizeText(pick(row, cols.round_type));

      const dealPayload: DealInsert = {
        deal_external_key: null,
        company_name: companyClean,
        normalized_company_name: normalizedCompany,
        company_country: normalizeText(pick(row, cols.country)),
        company_region: normalizeText(pick(row, cols.region)),
        sector: normalizeText(pick(row, cols.sector)),
        subsector: null,
        business_model: null,
        round_type: roundType,
        amount_raised_usd: amountUsd,
        amount_raised_original:
          amountMRaw === null || amountMRaw === undefined
            ? null
            : String(amountMRaw),
        currency: amountUsd !== null ? "USD" : null,
        announced_at: announcedAt,
        source: SOURCE,
        import_metadata: {
          sheet: SHEET_NAME,
          row_index_1based: i + 2,
          raw: snapshotRow(headerRow, row),
        },
      };

      // Upsert on the composite no-external-key unique index. We first try
      // to find an existing row with the same (source, normalized_company,
      // announced_at, round_type) tuple, because Supabase's onConflict does
      // not cover partial indexes directly.
      const dealId = await upsertDeal(client, dealPayload);
      if (!dealId) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2,
          reason: "deal upsert failed",
          raw: companyClean as Json,
        });
        continue;
      }
      rowsUpserted++;

      // Investors ----------------------------------------------------------
      const investorRaw = normalizeText(pick(row, cols.investors));
      if (investorRaw) {
        const pieces = splitInvestorList(investorRaw);
        const diRows: DealInvestorInsert[] = [];

        for (const piece of pieces) {
          const norm = normalizeName(piece);
          if (!norm) continue;

          const match = investorLookup.get(norm);
          if (match) {
            exactMatches++;
            diRows.push({
              deal_id: dealId,
              investor_id: match,
              investor_name_raw: piece,
              normalized_investor_name_raw: norm,
              role: null,
              is_lead: null,
              match_confidence: 0.95,
              match_method: "exact_normalized",
            });
          } else {
            unmatched++;
            diRows.push({
              deal_id: dealId,
              investor_id: null,
              investor_name_raw: piece,
              normalized_investor_name_raw: norm,
              role: null,
              is_lead: null,
              match_confidence: null,
              match_method: null,
            });
          }
        }

        if (diRows.length) {
          const { error: diErr } = await client
            .from("deal_investors")
            .upsert(diRows, {
              onConflict: "deal_id,normalized_investor_name_raw",
              ignoreDuplicates: false,
            });
          if (diErr) {
            recordIssue(run, {
              row_index: i + 2,
              reason: `deal_investors upsert failed: ${diErr.message}`,
            });
          } else {
            investorLinks += diRows.length;
          }
        }
      }

      if (rowsRead % 100 === 0) {
        logInfo(
          TAG,
          `progress rows=${rowsRead} upserted=${rowsUpserted} skipped=${rowsSkipped} matched=${exactMatches} unmatched=${unmatched}`
        );
      }
    }

    await finishImportRun(client, run, "success", {
      rows_read: rowsRead,
      rows_skipped: rowsSkipped,
      rows_upserted: rowsUpserted,
      child_rows_upserted: investorLinks,
      exact_matches: exactMatches,
      unmatched,
    });

    logInfo(TAG, "done", {
      rows_read: rowsRead,
      rows_upserted: rowsUpserted,
      rows_skipped: rowsSkipped,
      investor_links: investorLinks,
      exact_matches: exactMatches,
      unmatched,
      issues: run.issues.length,
    });
  } catch (err) {
    logWarn(TAG, "failed", { message: (err as Error).message });
    await finishImportRun(client, run, "failed", {
      rows_read: rowsRead,
      rows_skipped: rowsSkipped,
      rows_upserted: rowsUpserted,
      child_rows_upserted: investorLinks,
      exact_matches: exactMatches,
      unmatched,
    });
    throw err;
  }
}

// -- Helpers ---------------------------------------------------------------

type SupabaseLike = ReturnType<typeof getSupabaseAdmin>;

async function buildInvestorLookup(
  client: SupabaseLike
): Promise<Map<string, string>> {
  // Pull in pages of 1000 to avoid default row caps.
  const lookup = new Map<string, string>();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await client
      .from("investors")
      .select("id, normalized_name, source")
      .eq("source", SOURCE)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`investor lookup failed: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const row of data) {
      const n = (row as { normalized_name: string }).normalized_name;
      const id = (row as { id: string }).id;
      if (n && !lookup.has(n)) lookup.set(n, id);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return lookup;
}

async function upsertDeal(
  client: SupabaseLike,
  payload: DealInsert
): Promise<string | null> {
  // Try a select first to locate an existing row under the partial unique index.
  const q = client
    .from("deals")
    .select("id")
    .eq("source", payload.source)
    .eq("normalized_company_name", payload.normalized_company_name);

  const q2 = payload.announced_at
    ? q.eq("announced_at", payload.announced_at)
    : q.is("announced_at", null);
  const q3 = payload.round_type
    ? q2.eq("round_type", payload.round_type)
    : q2.is("round_type", null);

  const { data: existing, error: selErr } = await q3.maybeSingle();
  if (selErr && selErr.code !== "PGRST116") {
    logWarn(TAG, `deal select failed: ${selErr.message}`);
    return null;
  }

  if (existing?.id) {
    const { error: updErr } = await client
      .from("deals")
      .update(payload)
      .eq("id", existing.id);
    if (updErr) {
      logWarn(TAG, `deal update failed: ${updErr.message}`);
      return null;
    }
    return existing.id;
  }

  const { data: inserted, error: insErr } = await client
    .from("deals")
    .insert(payload)
    .select("id")
    .single();
  if (insErr || !inserted) {
    logWarn(TAG, `deal insert failed: ${insErr?.message ?? "unknown"}`);
    return null;
  }
  return inserted.id;
}

function pick(row: unknown[], idx: number | undefined): unknown {
  if (idx === undefined) return null;
  return row[idx] ?? null;
}

function snapshotRow(headerRow: unknown[], row: unknown[]): Json {
  const out: Record<string, Json> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = headerRow[i] == null ? `col_${i}` : String(headerRow[i]);
    const v = row[i];
    out[key] = v == null ? null : (v as Json);
  }
  return out;
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
