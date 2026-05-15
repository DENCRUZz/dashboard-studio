import type { DashboardWidget } from "./types";
import { aggregateRowsByTime } from "./time-bucket";
import type { TimeGroupDimension } from "./types";

export type ProcessedWidgetData = {
  rows: Record<string, unknown>[];
  /** Serie ya agrupada por tiempo (bar/line/pie), o null si no aplica */
  chartSeries: { name: string; value: number }[] | null;
  /** Campo numérico efectivo para KPI/agregados */
  effectiveValueField: string | undefined;
};


/** Check if a string is a valid JS identifier */
function isValidIdentifier(name: string): boolean {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name);
}

export function processWidgetData(
  widget: DashboardWidget,
  rows: Record<string, unknown>[],
): ProcessedWidgetData {
  let working = rows.map((r) => ({ ...r }));
  const display = widget.display;
  const customCols = display.customColumns || [];

  if (rows.length > 0) {
    const keys = Object.keys(rows[0]);
    const validKeys = keys.filter(isValidIdentifier);
    
    const utils = {
      sum: (col: string) => rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0),
      avg: (col: string) => {
        const sum = rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        return rows.length ? sum / rows.length : 0;
      },
      count: () => rows.length,
      max: (col: string) => {
        const vals = rows.map(r => Number(r[col])).filter(n => !Number.isNaN(n));
        return vals.length ? Math.max(...vals) : 0;
      },
      min: (col: string) => {
        const vals = rows.map(r => Number(r[col])).filter(n => !Number.isNaN(n));
        return vals.length ? Math.min(...vals) : 0;
      }
    };

    // 1. Process Custom Columns
    for (const col of customCols) {
      const expr = col.expression?.trim();
      if (!expr) continue;

      try {
        const fn = new Function(...validKeys, "row", "data", "utils", `return (${expr})`);
        working = working.map((row) => {
          try {
            const args = validKeys.map(k => row[k]);
            const result = fn(...args, row, rows, utils);
            return { ...row, [col.header]: result };
          } catch {
            return { ...row, [col.header]: null };
          }
        });
      } catch (e) {
        console.warn(`Syntax error in custom column expression: ${col.header}`);
      }
    }
  }

  const valueField = display.valueField;
  const viz = widget.display.visualization;
  const groupBy = widget.display.groupTimeBy ?? "none";
  const dateField = widget.display.dateField;
  const groupByField = widget.display.groupByField;

  let chartSeries: { name: string; value: number }[] | null = null;

  // 1. Agrupación categórica (si aplica, transformamos 'working' en filas agregadas)
  if (groupByField && valueField) {
    const groups: Record<string, Record<string, unknown>> = {};
    for (const r of working) {
      const key = String(r[groupByField] ?? "Sin categoría");
      if (!groups[key]) {
        groups[key] = { ...r };
      } else {
        // Sumamos campos numéricos
        for (const k of Object.keys(r)) {
          if (k === groupByField) continue;
          const val = r[k];
          if (typeof val === "number") {
            groups[key][k] = ((groups[key][k] as number) || 0) + val;
          } else if (typeof val === "string" && !Number.isNaN(Number(val))) {
            const n = Number(val);
            groups[key][k] = ((Number(groups[key][k]) as number) || 0) + n;
          }
        }
      }
    }
    working = Object.values(groups);
  }

  const chartKinds = ["bar", "line", "pie"];
  // 2. Agrupación temporal (eje X de gráficos)
  if (
    chartKinds.includes(viz) &&
    groupBy !== "none" &&
    dateField &&
    valueField
  ) {
    chartSeries = aggregateRowsByTime(
      working,
      dateField,
      valueField,
      groupBy as Exclude<TimeGroupDimension, "none">,
    );
  } else if (chartKinds.includes(viz) && groupByField && valueField) {
    // Si ya agrupamos categóricamente en el paso 1, usamos esas filas para el gráfico
    chartSeries = working.map((r) => ({
      name: String(r[groupByField] ?? "Sin categoría"),
      value: (r[valueField] as number) || 0,
    }));
  }

  // 3. Sorting (UI level)
  if (display.orderBy && display.orderBy.column) {
    const { column, ascending } = display.orderBy;
    working.sort((a, b) => {
      const va = a[column];
      const vb = b[column];

      if (va == null) return ascending ? -1 : 1;
      if (vb == null) return ascending ? 1 : -1;

      if (typeof va === "number" && typeof vb === "number") {
        return ascending ? va - vb : vb - va;
      }
      
      const sa = String(va);
      const sb = String(vb);
      return ascending ? sa.localeCompare(sb) : sb.localeCompare(sa);
    });
  }

  return {
    rows: working,
    chartSeries,
    effectiveValueField: valueField,
  };
}
