"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SessionSort, SessionFilter } from "@/components/notion-view-bar";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDisplayNumber } from "@/lib/format-numbers";
import { processWidgetData } from "@/lib/process-widget-data";
import {
  computeAggregate,
  fetchWidgetRows,
  type FetchResult,
} from "@/lib/fetch-widget-data";
import type { DashboardWidget, DisplayConfig, SupabaseConnection, WidgetComponent, ComponentAnchor } from "@/lib/types";
import { mergeDisplay, type FilterOperator, type ColorRule } from "@/lib/types";
import { useDashboardStore } from "@/stores/dashboard-store";

function checkColorRule(row: Record<string, unknown>, rule: ColorRule): boolean {
  const val = row[rule.column];
  const target = rule.value;
  const numVal = typeof val === "number" ? val : Number(val);
  const numTarget = typeof target === "number" ? target : Number(target);

  switch (rule.operator) {
    case "eq": return val == target;
    case "neq": return val != target;
    case "gt": return numVal > numTarget;
    case "gte": return numVal >= numTarget;
    case "lt": return numVal < numTarget;
    case "lte": return numVal <= numTarget;
    case "contains": return String(val).toLowerCase().includes(String(target).toLowerCase());
    case "not.contains": return !String(val).toLowerCase().includes(String(target).toLowerCase());
    case "is_empty": return val == null || val === "";
    case "is_not_empty": return val != null && val !== "";
    default: return false;
  }
}

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function WidgetChart({
  widget,
  rows,
  timeSeries,
}: {
  widget: DashboardWidget;
  rows: Record<string, unknown>[];
  timeSeries: { name: string; value: number }[] | null;
}) {
  const display = mergeDisplay(widget.display);
  const cat = display.categoryField ?? display.labelField;
  const valField = display.valueField;
  const fmt = (n: number) => formatDisplayNumber(n, display, valField);

  const data = useMemo(() => {
    if (timeSeries !== null) {
      return timeSeries.map((t) => ({
        name: t.name,
        value: t.value,
      }));
    }
    if (!cat || !valField) {
      return [];
    }
    return rows.map((r) => ({
      name: String(r[cat] ?? ""),
      value:
        typeof r[valField] === "number"
          ? r[valField]
          : Number(r[valField]) || 0,
    }));
  }, [rows, cat, valField, timeSeries]);

  if (timeSeries !== null && timeSeries.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Sin puntos tras agrupar por tiempo (revisa fechas y columnas).
      </p>
    );
  }

  if (timeSeries === null && (!cat || !valField)) {
    return (
      <p className="text-sm text-zinc-500">
        Configura categoría y valor, o agrupación temporal + fecha + cantidad.
      </p>
    );
  }

  if (data.length === 0) {
    return <p className="text-sm text-zinc-500">Sin puntos para el gráfico.</p>;
  }

  const formatTooltip = (value: unknown): string => {
    if (value == null) return "";
    if (Array.isArray(value))
      return value.map((v) => formatTooltip(v)).join(", ");
    if (typeof value === "number") return fmt(value);
    return String(value);
  };

  if (display.visualization === "pie") {
    return (
      <div className="flex-1 min-h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="40%"
              outerRadius={60}
              label={{ fontSize: 10, fill: display.colorText || "currentColor" }}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={display.colorAccent || COLORS[i % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={formatTooltip}
              contentStyle={{
                backgroundColor: display.colorBackground || "var(--background)",
                borderColor: "var(--border)",
                color: display.colorText || "var(--foreground)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: display.colorText || "var(--foreground)" }}
            />
            <Legend
              verticalAlign="bottom"
              align="center"
              wrapperStyle={{
                paddingTop: "20px",
                fontSize: "11px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (display.visualization === "line") {
    return (
      <div className="flex-1 min-h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis
              width={70}
              tick={{ fontSize: 10, fill: display.colorText || 'currentColor' }}
              tickFormatter={(v) =>
                typeof v === "number" ? fmt(v) : String(v)
              }
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={formatTooltip} 
              contentStyle={{ 
                backgroundColor: display.colorBackground || 'var(--background)', 
                borderColor: 'var(--border)',
                color: display.colorText || 'var(--foreground)',
                borderRadius: '8px',
                fontSize: '12px'
              }}
              itemStyle={{ color: display.colorText || 'var(--foreground)' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={display.colorAccent || "var(--accent)"}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-[180px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: display.colorText || 'currentColor' }} />
          <YAxis
            width={70}
            tick={{ fontSize: 10, fill: display.colorText || 'currentColor' }}
            tickFormatter={(v) =>
              typeof v === "number" ? fmt(v) : String(v)
            }
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            formatter={formatTooltip} 
            contentStyle={{ 
              backgroundColor: display.colorBackground || 'var(--background)', 
              borderColor: 'var(--border)',
              color: display.colorText || 'var(--foreground)',
              borderRadius: '8px',
              fontSize: '12px'
            }}
            itemStyle={{ color: display.colorText || 'var(--foreground)' }}
          />
          <Bar
            dataKey="value"
            fill={display.colorAccent || "var(--accent)"}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function WidgetTable({
  widget,
  rows,
  searchQuery,
}: {
  widget: DashboardWidget;
  rows: Record<string, unknown>[];
  searchQuery?: string;
}) {
  const display = mergeDisplay(widget.display);

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  const keys = useMemo(() => {
    const hidden = new Set(display.hiddenColumns);
    const k = new Set<string>();
    for (const r of filteredRows) {
      Object.keys(r).forEach((x) => k.add(x));
    }
    const sorted = [...k].filter((c) => !hidden.has(c));
    if (display.columnOrder && display.columnOrder.length > 0) {
      const order = display.columnOrder;
      sorted.sort((a, b) => {
        let idxA = order.indexOf(a);
        let idxB = order.indexOf(b);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        return idxA - idxB;
      });
    }
    return sorted;
  }, [filteredRows, display.hiddenColumns]);

  if (filteredRows.length === 0) {
    return <p className="text-sm text-zinc-500 py-4">Sin resultados.</p>;
  }

  const formatCell = (k: string, v: unknown) => formatCellValue(v, display, k);

  return (
    <div className="flex-1 overflow-auto min-h-0 rounded-md border border-zinc-200 dark:border-zinc-800">
      <table className="w-full text-left text-xs border-collapse">
        <thead 
          className="sticky top-0 z-10 bg-zinc-100 dark:bg-zinc-900"
          style={{ backgroundColor: display.colorBackground, color: display.colorText }}
        >
          <tr>
            {keys.map((c) => (
              <th
                key={c}
                className="px-3 py-2 font-semibold text-zinc-600 dark:text-zinc-400 border-b border-zinc-200 dark:border-zinc-800"
                style={{ color: display.colorText }}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filteredRows.map((r, i) => {
            const rule = display.colorRules.find(rule => checkColorRule(r, rule));
            const rowStyle = rule ? {
              backgroundColor: rule.colorBackground,
              color: rule.colorText
            } : {};

            return (
              <tr
                key={i}
                className="border-t border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
                style={rowStyle}
              >
                {keys.map((c) => (
                  <td
                    key={c}
                    className="px-3 py-2 font-sans"
                    style={{ color: rowStyle.color ? 'inherit' : (display.colorText || 'inherit') }}
                  >
                    {formatCell(c, r[c])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
        {display.showTotalRow && filteredRows.length > 0 && (
          <tfoot className="sticky bottom-0 bg-zinc-50 font-bold dark:bg-zinc-900">
            <tr className="border-t-2 border-zinc-200 dark:border-zinc-700">
              {keys.map((c, i) => {
                const isTotal = display.totalColumns.includes(c);
                let val: string | number = "";
                if (isTotal) {
                  const sum = filteredRows.reduce((acc, r) => {
                    const v = r[c];
                    const n = typeof v === "number" ? v : Number(v);
                    return acc + (Number.isFinite(n) ? n : 0);
                  }, 0);
                  val = formatCell(c, sum);
                } else if (i === 0) {
                  val = "TOTAL";
                }
                return (
                  <td key={c} className="px-3 py-2">
                    {val}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function formatCellValue(
  v: unknown,
  display: DisplayConfig,
  column: string,
): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  if (typeof v === "number") {
    return formatDisplayNumber(v, display, column);
  }
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) {
    const n = Number(v);
    if (Number.isFinite(n) && column !== "id")
      return formatDisplayNumber(n, display, column);
  }
  return String(v);
}

function WidgetCards({
  widget,
  rows,
  searchQuery,
}: {
  widget: DashboardWidget;
  rows: Record<string, unknown>[];
  searchQuery?: string;
}) {
  const display = mergeDisplay(widget.display);
  const t = display.cardTitleField;
  const props = display.cardProperties || [];

  const filteredRows = useMemo(() => {
    if (!searchQuery) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  return (
    <div className="flex-1 overflow-auto min-h-0">
      <ul className="grid gap-3 sm:grid-cols-2">
      {filteredRows.map((r, i) => {
        const rule = display.colorRules.find(rule => checkColorRule(r, rule));
        const cardStyle = rule ? {
          backgroundColor: rule.colorBackground,
          color: rule.colorText,
          borderColor: rule.colorBackground ? 'transparent' : undefined
        } : {};

        return (
          <li
            key={i}
            className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/50"
            style={{ 
              backgroundColor: cardStyle.backgroundColor || (display.colorText ? `${display.colorText}08` : undefined),
              color: cardStyle.color || display.colorText,
              borderColor: cardStyle.borderColor
            }}
          >
            <p className="mb-1 text-sm font-semibold" style={{ color: cardStyle.color || display.colorText }}>
              {t ? formatSimple(r[t]) : `Fila ${i + 1}`}
            </p>
            <div className="space-y-1">
              {props.map((p) => (
                <div key={p} className="flex items-baseline justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-wider opacity-60">
                    {p}
                  </span>
                  <span className="text-[11px] font-medium opacity-90">
                    {formatCellValue(r[p], display, p)}
                  </span>
                </div>
              ))}
              {!props.length && display.cardSubtitleField && (
                <p className="text-xs opacity-70">
                  {formatSimple(r[display.cardSubtitleField])}
                </p>
              )}
            </div>
          </li>
        );
      })}
      </ul>
    </div>
  );
}

function formatSimple(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

const anchorStyles: Record<ComponentAnchor, React.CSSProperties> = {
  'top-left': { top: 0, left: 0 },
  'top-center': { top: 0, left: '50%', transform: 'translateX(-50%)' },
  'top-right': { top: 0, right: 0 },
  'center-left': { top: '50%', left: 0, transform: 'translateY(-50%)' },
  'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  'center-right': { top: '50%', right: 0, transform: 'translateY(-50%)' },
  'bottom-left': { bottom: 0, left: 0 },
  'bottom-center': { bottom: 0, left: '50%', transform: 'translateX(-50%)' },
  'bottom-right': { bottom: 0, right: 0 },
};

function AdvancedRenderer({ 
  widget, 
  rows, 
  processed 
}: { 
  widget: DashboardWidget; 
  rows: Record<string, unknown>[]; 
  processed: any;
}) {
  const display = mergeDisplay(widget.display);
  const components = widget.visualComponents || [];

  return (
    <div className="absolute inset-0 overflow-hidden">
      {components.filter(c => c.visible).map(c => {
        let content = c.content || "";
        
        if (c.type === 'value' && c.content) {
          const val = computeAggregate(rows, c.content, display.aggregate);
          content = typeof val === 'number' 
            ? formatDisplayNumber(val, display, c.content)
            : String(val ?? "");
        }

        const anchorStyle = anchorStyles[c.position.anchor] || {};
        
        return (
          <div
            key={c.id}
            style={{
              ...anchorStyle,
              position: 'absolute',
              color: c.color,
              fontSize: c.fontSize ? `${c.fontSize}px` : undefined,
              fontWeight: c.fontWeight,
              fontFamily: c.fontFamily,
              opacity: c.opacity,
              marginLeft: c.position.x,
              marginTop: c.position.y,
              transform: `${anchorStyle.transform || ''} rotate(${c.position.rotation || 0}deg)`.trim(),
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 10,
              width: c.position.width || 'auto',
              height: c.position.height || 'auto',
            }}
          >
            {c.type === 'icon' ? (
              <span className="text-xl">★</span>
            ) : c.type === 'chart' ? (
              <div style={{ width: '100%', height: '100%', minWidth: '100px', minHeight: '100px' }}>
                <WidgetChart 
                  widget={{
                    ...widget,
                    display: { ...widget.display, colorAccent: c.color || widget.display.colorAccent }
                  }} 
                  rows={rows} 
                  timeSeries={processed?.timeSeries || null} 
                />
              </div>
            ) : (
              content
            )}
          </div>
        );
      })}
    </div>
  );
}

export function WidgetView({
  widget,
  connection,
  isPreview = false,
  sessionSort,
  sessionFilters,
  sessionHidden,
  onColumnsChange,
}: {
  widget: DashboardWidget;
  connection: SupabaseConnection | undefined;
  isPreview?: boolean;
  sessionSort?: SessionSort;
  sessionFilters?: SessionFilter[];
  sessionHidden?: string[];
  onColumnsChange?: (cols: string[]) => void;
}) {
  const [result, setResult] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    if (!connection?.url || !connection?.anonKey) {
      setResult({
        ok: false,
        message: "Configura una conexión Supabase válida.",
      });
      return;
    }
    if (widget.source.kind === "table" && !widget.source.table?.trim()) {
      setResult({ ok: false, message: "Indica el nombre de la tabla." });
      return;
    }
    if (widget.source.kind === "rpc" && !widget.source.functionName?.trim()) {
      setResult({ ok: false, message: "Indica el nombre de la función RPC." });
      return;
    }
    setLoading(true);
    const out = await fetchWidgetRows(connection, widget);
    setResult(out);
    setLoading(false);
  }, [connection, widget]);

  useEffect(() => {
    void load();
  }, [load]);

  // Surface column names to parent
  const onColumnsChangeRef = useRef(onColumnsChange);
  useEffect(() => { onColumnsChangeRef.current = onColumnsChange; }, [onColumnsChange]);
  useEffect(() => {
    if (!result?.ok) return;
    const cols = new Set<string>();
    result.rows.forEach((r) => Object.keys(r).forEach((k) => cols.add(k)));
    onColumnsChangeRef.current?.([...cols]);
  }, [result]);

  const editing = useDashboardStore((s) => s.editing);

  const processed = useMemo(() => {
    const rows = result?.ok ? result.rows : [];
    return processWidgetData(widget, rows);
  }, [widget, result]);

  const display = mergeDisplay(widget.display);

  // Apply session sort + filters + hidden (client-side, session-only)
  const sessionRows = useMemo(() => {
    let rows = processed.rows;

    // Filter
    if (sessionFilters?.length) {
      rows = rows.filter((row) =>
        sessionFilters.every((f) => {
          const val = row[f.column];
          const target = f.value;
          const num = typeof val === "number" ? val : Number(val);
          const numTarget = Number(target);
          switch (f.operator) {
            case "eq": return String(val) === target;
            case "neq": return String(val) !== target;
            case "gt": return num > numTarget;
            case "gte": return num >= numTarget;
            case "lt": return num < numTarget;
            case "lte": return num <= numTarget;
            case "contains": return String(val).toLowerCase().includes(target.toLowerCase());
            case "not.contains": return !String(val).toLowerCase().includes(target.toLowerCase());
            case "is_empty": return val == null || val === "";
            case "is_not_empty": return val != null && val !== "";
            default: return true;
          }
        })
      );
    }

    // Sort
    if (sessionSort) {
      const { column, ascending } = sessionSort;
      rows = [...rows].sort((a, b) => {
        const av = a[column];
        const bv = b[column];
        if (av == null && bv == null) return 0;
        if (av == null) return ascending ? 1 : -1;
        if (bv == null) return ascending ? -1 : 1;
        if (typeof av === "number" && typeof bv === "number")
          return ascending ? av - bv : bv - av;
        const as = String(av).toLowerCase();
        const bs = String(bv).toLowerCase();
        return ascending ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }

    return rows;
  }, [processed.rows, sessionSort, sessionFilters]);

  // Merge session hidden with display hidden
  const effectiveHidden = useMemo(() => {
    const base = display.hiddenColumns ?? [];
    if (!sessionHidden?.length) return base;
    return [...new Set([...base, ...sessionHidden])];
  }, [display.hiddenColumns, sessionHidden]);

  if (!connection && !isPreview) {
    return (
      <p className="text-sm text-amber-700 dark:text-amber-400">
        Selecciona o crea una conexión Supabase para este bloque.
      </p>
    );
  }

  if (loading && !result) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-zinc-500">
        Cargando…
      </div>
    );
  }

  if (result && !result.ok) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-red-600 dark:text-red-400">{result.message}</p>
        {editing && (
          <button
            type="button"
            onClick={() => void load()}
            className="text-xs font-medium text-zinc-600 underline dark:text-zinc-400"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  const rows = sessionRows;

  if (widget.visualMode === 'advanced') {
    return <AdvancedRenderer widget={widget} rows={rows} processed={processed} />;
  }

  if (widget.display.visualization === "kpi") {
    const field =
      processed.effectiveValueField ?? display.valueField;
    const agg = computeAggregate(rows, field, display.aggregate);
    const label =
      display.aggregate === "count_rows"
        ? "Filas"
        : display.valueField ?? "Valor";
    const num =
      typeof agg === "number"
        ? agg
        : Number(agg);
    const shown =
      typeof agg === "number" || !Number.isNaN(num)
        ? formatDisplayNumber(
            typeof agg === "number" ? agg : num,
            display,
            field
          )
        : String(agg);
    return (
      <div className="flex flex-col justify-center py-1">
        <p className="text-[10px] uppercase font-bold tracking-wider opacity-60" style={{ color: display.colorText }}>{label}</p>
        <p 
          className="mt-1 text-2xl sm:text-3xl font-black tabular-nums tracking-tight break-words leading-tight"
          style={{ color: display.colorAccent || display.colorText }}
        >
          {shown}
        </p>
      </div>
    );
  }

  if (
    widget.display.visualization === "bar" ||
    widget.display.visualization === "line" ||
    widget.display.visualization === "pie"
  ) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <WidgetChart
          widget={widget}
          rows={rows}
          timeSeries={processed.chartSeries}
        />
      </div>
    );
  }

  const showSearch = display.enableSearch && (display.visualization === "table" || display.visualization === "cards");

  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-auto">
      {showSearch && (
        <div className="relative">
          <input
            type="text"
            className="w-full rounded-md border border-zinc-200 bg-white px-8 py-1 text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900"
            placeholder="Buscar en este bloque..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <span className="absolute left-2.5 top-1.5 text-zinc-400">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          {searchQuery && (
            <button 
              className="absolute right-2.5 top-1.5 text-zinc-400 hover:text-zinc-600"
              onClick={() => setSearchQuery("")}
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      )}

      {widget.display.visualization === "cards" ? (
        <WidgetCards widget={widget} rows={rows} searchQuery={searchQuery} />
      ) : (
        <WidgetTable
          widget={{ ...widget, display: { ...widget.display, hiddenColumns: effectiveHidden } }}
          rows={rows}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}
