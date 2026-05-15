import type { TimeGroupDimension } from "./types";

export function parseRowDate(v: unknown): Date | null {
  if (v instanceof Date && !Number.isNaN(+v)) return v;
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  }
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(+d) ? null : d;
  }
  return null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** ISO week label YYYY-Www (lunes como inicio de semana). */
export function isoWeekLabel(d: Date): string {
  const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = x.getUTCDay() || 7;
  x.setUTCDate(x.getUTCDate() + 4 - day);
  const y = x.getUTCFullYear();
  const z = new Date(Date.UTC(y, 0, 1));
  const week = Math.ceil(((+x - +z) / 86400000 + 1) / 7);
  return `${y}-W${pad(week)}`;
}

export function bucketLabel(d: Date, dim: Exclude<TimeGroupDimension, "none">): string {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  switch (dim) {
    case "day":
      return `${y}-${pad(m)}-${pad(day)}`;
    case "week":
      return isoWeekLabel(d);
    case "month":
      return `${y}-${pad(m)}`;
    case "quarter":
      return `${y}-Q${Math.ceil(m / 3)}`;
    case "year":
      return `${y}`;
    default:
      return `${y}-${pad(m)}-${pad(day)}`;
  }
}

export function aggregateRowsByTime(
  rows: Record<string, unknown>[],
  dateField: string,
  valueField: string,
  dim: Exclude<TimeGroupDimension, "none">,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    const dv = parseRowDate(r[dateField]);
    if (!dv) continue;
    const key = bucketLabel(dv, dim);
    const raw = r[valueField];
    const nv =
      typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number(raw);
    if (!Number.isFinite(nv)) continue;
    map.set(key, (map.get(key) ?? 0) + nv);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name, value }));
}
