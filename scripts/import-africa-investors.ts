/**
 * Import investors from the "Africa — The Big Deal" Excel workbook.
 *
 * Usage:
 *   npx tsx scripts/import-africa-investors.ts [path-to-xlsx]
 *
 * Default path: data/africa-big-deal.xlsx
 *
 * Env:
 *   NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Idempotency:
 *   - investors are upserted on (source, normalized_name, coalesce(website, ''))
 *   - investor_activity_yearly rows are upserted on (investor_id, activity_year, source)
 *   Re-running the script on the same file is safe.
 */

import path from "node:path";
import * as XLSX from "xlsx";

import { getSupabaseAdmin } from "../lib/supabase/admin.js";
import {
  INVESTOR_HEADER_ALIASES,
  resolveHeaders,
  type InvestorCol,
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
  normalizeUrl,
  parseNumeric,
} from "../lib/investors/normalization.js";
import type {
  InvestorActivityInsert,
  InvestorInsert,
  Json,
} from "../lib/investors/import-types.js";

const SOURCE = "africa_big_deal_2019_2023";
const SHEET_NAME = "Investors 2019-2023";
const TAG = "import-africa-investors";
const ACTIVITY_YEARS: Array<{
  year: number;
  col: InvestorCol;
}> = [
  { year: 2019, col: "deals_2019" },
  { year: 2020, col: "deals_2020" },
  { year: 2021, col: "deals_2021" },
  { year: 2022, col: "deals_2022" },
  { year: 2023, col: "deals_2023" },
];

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
  const cols = resolveHeaders<InvestorCol>(headerRow, INVESTOR_HEADER_ALIASES);

  const missing: InvestorCol[] = (["investor"] as InvestorCol[]).filter(
    (k) => cols[k] === undefined
  );
  if (missing.length) {
    throw new Error(
      `Missing required columns in "${SHEET_NAME}": ${missing.join(", ")}`
    );
  }

  const client = getSupabaseAdmin();
  const run = await startImportRun(client, {
    importType: "investors",
    source: SOURCE,
    fileName: path.basename(filePath),
  });

  let rowsRead = 0;
  let rowsSkipped = 0;
  let rowsUpserted = 0;
  let activityUpserted = 0;

  try {
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      rowsRead++;

      const rawName = pick(row, cols.investor);
      const nameClean = normalizeText(rawName);
      if (!nameClean) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2, // +2 accounts for 1-based + header row
          reason: "missing investor name",
        });
        continue;
      }

      const normalized = normalizeName(nameClean);
      if (!normalized) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2,
          reason: "name normalizes to empty",
          raw: String(rawName) as Json,
        });
        continue;
      }

      const website = normalizeUrl(pick(row, cols.website));
      const hqCountry = normalizeText(pick(row, cols.hq));
      const hqRegion = normalizeText(pick(row, cols.hq_region));

      const importMetadata: Json = {
        sheet: SHEET_NAME,
        row_index_1based: i + 2,
        raw: snapshotRow(headerRow, row),
      };

      const payload: InvestorInsert = {
        investor_name: nameClean,
        normalized_name: normalized,
        fund_name: null,
        investor_type: null,
        website,
        linkedin_url: null,
        hq_city: null,
        hq_country: hqCountry,
        hq_region: hqRegion,
        geo_focus: null,
        stage_focus: null,
        sector_focus: null,
        check_min_usd: null,
        check_max_usd: null,
        lead_rounds: null,
        follow_on_only: null,
        thesis_text: null,
        source: SOURCE,
        source_url: null,
        source_confidence: 0.8,
        last_verified_at: null,
        import_metadata: importMetadata,
      };

      const { data: upserted, error: upsertErr } = await client
        .from("investors")
        .upsert(payload, {
          onConflict: "source,normalized_name,website",
          ignoreDuplicates: false,
        })
        .select("id")
        .single();

      if (upsertErr || !upserted) {
        rowsSkipped++;
        recordIssue(run, {
          row_index: i + 2,
          reason: `upsert failed: ${upsertErr?.message ?? "unknown"}`,
          raw: nameClean as Json,
        });
        continue;
      }
      const investorId = upserted.id;
      rowsUpserted++;

      // Activity rows (2019–2023) ------------------------------------------
      const activityRows: InvestorActivityInsert[] = [];
      for (const { year, col } of ACTIVITY_YEARS) {
        const idx = cols[col];
        if (idx === undefined) continue;
        const count = parseNumeric(pick(row, idx));
        if (count === null) continue;
        activityRows.push({
          investor_id: investorId,
          activity_year: year,
          deal_count: Math.max(0, Math.round(count)),
          source: SOURCE,
        });
      }

      if (activityRows.length) {
        const { error: actErr } = await client
          .from("investor_activity_yearly")
          .upsert(activityRows, {
            onConflict: "investor_id,activity_year,source",
            ignoreDuplicates: false,
          });
        if (actErr) {
          recordIssue(run, {
            row_index: i + 2,
            reason: `activity upsert failed: ${actErr.message}`,
          });
        } else {
          activityUpserted += activityRows.length;
        }
      }

      if (rowsRead % 100 === 0) {
        logInfo(
          TAG,
          `progress rows=${rowsRead} upserted=${rowsUpserted} skipped=${rowsSkipped}`
        );
      }
    }

    await finishImportRun(client, run, "success", {
      rows_read: rowsRead,
      rows_skipped: rowsSkipped,
      rows_upserted: rowsUpserted,
      child_rows_upserted: activityUpserted,
    });

    logInfo(TAG, "done", {
      rows_read: rowsRead,
      rows_upserted: rowsUpserted,
      rows_skipped: rowsSkipped,
      activity_upserted: activityUpserted,
      issues: run.issues.length,
    });
  } catch (err) {
    logWarn(TAG, "failed", { message: (err as Error).message });
    await finishImportRun(client, run, "failed", {
      rows_read: rowsRead,
      rows_skipped: rowsSkipped,
      rows_upserted: rowsUpserted,
      child_rows_upserted: activityUpserted,
    });
    throw err;
  }
}

// -- Helpers ---------------------------------------------------------------

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
