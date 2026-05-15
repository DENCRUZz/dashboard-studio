import type { PostgrestError } from "@supabase/supabase-js";
import {
  type ConnectionCredentials,
  getSupabaseForConnection,
} from "./supabase-clients";
import {
  type AggregateMode,
  type DashboardWidget,
  type RowFilter,
  type FilterGroup,
} from "./types";
import { resolveValueVariables, resolveVariables } from "./variables";

export type FetchResult =
  | {
      ok: true;
      rows: Record<string, unknown>[];
      rowCount?: number;
    }
  | { ok: false; message: string; code?: string };

/**
 * Builds a PostgREST filter string for nested logic (OR/AND groups).
 */
function buildFilterString(f: RowFilter | FilterGroup): string {
  if ("operator" in f && "rules" in f) {
    const group = f as FilterGroup;
    if (group.rules.length === 0) return "";
    const sub = group.rules
      .map((r) => buildFilterString(r))
      .filter((s) => s !== "")
      .join(",");
    if (!sub) return "";
    return `${group.operator}(${sub})`;
  } else {
    const row = f as RowFilter;
    const val = resolveValueVariables(row.value);
    
    // Operators mapping for string format
    let op = row.operator;
    let finalVal = String(val);

    // Special handling for some operators
    if (op === "is_empty") return `${row.column}.is.null`;
    if (op === "is_not_empty") return `${row.column}.not.is.null`;
    
    // Escape commas in values for the .or() string
    if (typeof finalVal === "string") {
      finalVal = finalVal.replace(/,/g, "\\,");
    }

    return `${row.column}.${op}.${finalVal}`;
  }
}

function applyFilters<T>(
  query: T,
  filters: RowFilter[],
  advancedFilters?: FilterGroup,
): T {
  let q = query as any;

  // 1. Simple filters (legacy)
  for (const f of filters) {
    const val = resolveValueVariables(f.value);
    switch (f.operator) {
      case "eq": q = q.eq(f.column, val); break;
      case "neq": q = q.neq(f.column, val); break;
      case "gt": q = q.gt(f.column, val); break;
      case "gte": q = q.gte(f.column, val); break;
      case "lt": q = q.lt(f.column, val); break;
      case "lte": q = q.lte(f.column, val); break;
      case "like": q = q.like(f.column, resolveVariables(String(f.value))); break;
      case "ilike": q = q.ilike(f.column, resolveVariables(String(f.value))); break;
      case "is": q = q.is(f.column, f.value); break;
      case "is_empty": q = q.is(f.column, null); break;
      case "is_not_empty": q = q.not("is", f.column, null); break;
    }
  }

  // 2. Advanced filters (nested)
  if (advancedFilters && advancedFilters.rules.length > 0) {
    const filterStr = buildFilterString(advancedFilters);
    if (filterStr) q = q.or(filterStr);
  }

  return q as T;
}

export async function fetchWidgetRows(
  connection: ConnectionCredentials,
  widget: DashboardWidget,
): Promise<FetchResult> {
  const client = getSupabaseForConnection(connection);

  try {
    const src = widget.source;
    const adv = "advancedFilters" in src ? src.advancedFilters : undefined;

    if (src.kind === "rpc") {
      const args = resolveValueVariables(src.args);
      let q = client.rpc(src.functionName, args as never);
      q = applyFilters(q, src.filters, adv);
      
      const { data, error } = await q;
      if (error) return rpcError(error);
      const rows = normalizeRpcResult(data);
      return { ok: true, rows };
    }

    const display = widget.display;
    const schema = src.schema ?? "public";
    const fromTable = () =>
      schema === "public"
        ? client.from(src.table)
        : client.schema(schema).from(src.table);

    if (display.aggregate === "count_rows") {
      let q = fromTable().select("*", { count: "exact", head: true });
      q = applyFilters(q, src.filters, adv);
      const { count, error } = await q;
      if (error) return rpcError(error);
      return { ok: true, rows: [{ count: count ?? 0 }], rowCount: count ?? 0 };
    }

    let allRows: Record<string, unknown>[] = [];
    const limit = Math.min(Math.max(src.limit, 1), 20000);
    const PAGE_SIZE = 1000;
    let offset = 0;

    while (allRows.length < limit) {
      const take = Math.min(PAGE_SIZE, limit - allRows.length);
      let q = fromTable().select(src.select);
      q = applyFilters(q, src.filters, adv);

      if (src.orderBy) {
        q = q.order(src.orderBy.column, { ascending: src.orderBy.ascending });
      }

      q = q.range(offset, offset + take - 1);

      const { data, error } = await q;
      if (error) return rpcError(error);
      if (!data || data.length === 0) break;

      const chunk = data as unknown as Record<string, unknown>[];
      allRows = [...allRows, ...chunk];
      if (chunk.length < take) break;
      offset += chunk.length;
    }

    return { ok: true, rows: allRows, rowCount: allRows.length };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return { ok: false, message: msg };
  }
}

function rpcError(error: PostgrestError): FetchResult {
  return { ok: false, message: error.message, code: error.code };
}

function normalizeRpcResult(data: unknown): Record<string, unknown>[] {
  if (data == null) return [];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  if (typeof data === "object") return [data as Record<string, unknown>];
  return [{ value: data }];
}

export function computeAggregate(
  rows: Record<string, unknown>[],
  field: string | undefined,
  mode: AggregateMode,
): string | number {
  if (mode === "count_rows") {
    const n = rows[0]?.count;
    if (typeof n === "number") return n;
    return rows.length;
  }
  if (!field) return rows.length ? String(rows[0]) : "—";

  const vals = rows
    .map((r) => r[field])
    .filter((v) => v != null && (typeof v === "number" || (typeof v === "string" && v !== "")));

  if (mode === "count") return vals.length;
  if (mode === "first") {
    const v = rows[0]?.[field];
    if (v == null) return "—";
    return typeof v === "number" || typeof v === "string" ? v : JSON.stringify(v);
  }

  const nums = vals
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((n) => !Number.isNaN(n));

  if (nums.length === 0) return "—";

  switch (mode) {
    case "sum": return nums.reduce((a, b) => a + b, 0);
    case "avg": return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min": return Math.min(...nums);
    case "max": return Math.max(...nums);
    default: return nums[0] ?? "—";
  }
}
