"use client";

import { useRef, useState, useEffect } from "react";
import { useDashboardStore } from "@/stores/dashboard-store";

export type SessionSort = { column: string; ascending: boolean } | null;
export type SessionFilter = {
  id: string;
  column: string;
  operator: string;
  value: string;
};

const OPERATORS = [
  { value: "eq", label: "es igual a" },
  { value: "neq", label: "no es igual a" },
  { value: "gt", label: "mayor que" },
  { value: "gte", label: "mayor o igual a" },
  { value: "lt", label: "menor que" },
  { value: "lte", label: "menor o igual a" },
  { value: "contains", label: "contiene" },
  { value: "not.contains", label: "no contiene" },
  { value: "is_empty", label: "está vacío" },
  { value: "is_not_empty", label: "no está vacío" },
];

const NO_VALUE_OPS = new Set(["is_empty", "is_not_empty"]);

interface Props {
  widget: any;
  columns: string[];
  sessionSort: SessionSort;
  setSessionSort: (s: SessionSort) => void;
  sessionFilters: SessionFilter[];
  setSessionFilters: (f: SessionFilter[]) => void;
  sessionHidden: string[];
  setSessionHidden: (h: string[]) => void;
}

export function NotionViewBar({
  widget,
  columns,
  sessionSort,
  setSessionSort,
  sessionFilters,
  setSessionFilters,
  sessionHidden,
  setSessionHidden,
}: Props) {
  const applyView = useDashboardStore((s) => s.applyWidgetView);

  const [open, setOpen] = useState<"sort" | "filter" | "properties" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // new-filter form state
  const [nfCol, setNfCol] = useState(columns[0] ?? "");
  const [nfOp, setNfOp] = useState("eq");
  const [nfVal, setNfVal] = useState("");

  useEffect(() => {
    if (columns.length > 0 && !nfCol) setNfCol(columns[0]);
  }, [columns, nfCol]);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setOpen(null);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const toggle = (d: "sort" | "filter" | "properties") =>
    setOpen((p) => (p === d ? null : d));

  const addFilter = () => {
    if (!nfCol) return;
    setSessionFilters([
      ...sessionFilters,
      { id: `${Date.now()}`, column: nfCol, operator: nfOp, value: nfVal },
    ]);
    setNfVal("");
  };

  const removeFilter = (id: string) =>
    setSessionFilters(sessionFilters.filter((f) => f.id !== id));

  const toggleHidden = (col: string) =>
    setSessionHidden(
      sessionHidden.includes(col)
        ? sessionHidden.filter((c) => c !== col)
        : [...sessionHidden, col]
    );

  const hasViews = widget.views?.length > 0;
  const btnBase =
    "flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150";
  const btnInactive =
    "text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:text-zinc-500";
  const btnActive =
    "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";

  return (
    <div
      className="flex items-center justify-between gap-2 mt-1.5 min-w-0"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* ── LEFT: view tabs ── */}
      <div className="flex items-center gap-0.5 flex-wrap min-w-0">
        {hasViews &&
          widget.views.map((v: any) => {
            const isActive = widget.activeViewId === v.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => applyView(widget.id, v.id)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium whitespace-nowrap transition-all duration-150 ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800"
                    : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h18M3 18h18" />
                </svg>
                {v.name}
              </button>
            );
          })}
      </div>

      {/* ── RIGHT: action buttons ── */}
      <div className="relative flex items-center gap-0.5 shrink-0 z-[9999]" ref={containerRef}>
        {/* Sort */}
        <button
          type="button"
          onClick={() => toggle("sort")}
          title="Ordenar"
          className={`${btnBase} ${sessionSort ? btnActive : btnInactive}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          <span className="hidden sm:inline">Ordenar</span>
        </button>

        {/* Filter */}
        <button
          type="button"
          onClick={() => toggle("filter")}
          title="Filtrar"
          className={`${btnBase} ${sessionFilters.length > 0 ? btnActive : btnInactive}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="hidden sm:inline">Filtrar</span>
          {sessionFilters.length > 0 && (
            <span className="inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-blue-600 px-0.5 text-[8px] font-bold text-white">
              {sessionFilters.length}
            </span>
          )}
        </button>

        {/* Properties */}
        <button
          type="button"
          onClick={() => toggle("properties")}
          title="Visibilidad de propiedades"
          className={`${btnBase} ${sessionHidden.length > 0 ? btnActive : btnInactive}`}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="hidden sm:inline">Propiedades</span>
        </button>

        {/* ── SORT DROPDOWN ── */}
        {open === "sort" && (
          <div className="absolute right-0 top-full mt-1.5 z-[9999] w-64 rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Ordenar por</p>
              {sessionSort && (
                <button
                  type="button"
                  onClick={() => setSessionSort(null)}
                  className="text-[10px] text-red-500 hover:text-red-600 font-medium"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
              {columns.length === 0 && (
                <p className="text-[11px] text-zinc-400 text-center py-3">Sin columnas cargadas</p>
              )}
              {columns.map((col) => (
                <div key={col} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/60">
                  <span className="text-[11px] text-zinc-700 dark:text-zinc-300 truncate flex-1">{col}</span>
                  <div className="flex gap-1 shrink-0">
                    {[true, false].map((asc) => {
                      const isSelected = sessionSort?.column === col && sessionSort.ascending === asc;
                      return (
                        <button
                          key={String(asc)}
                          type="button"
                          onClick={() =>
                            setSessionSort(isSelected ? null : { column: col, ascending: asc })
                          }
                          className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                            isSelected
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                              : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          {asc ? "↑ A→Z" : "↓ Z→A"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER DROPDOWN ── */}
        {open === "filter" && (
          <div className="absolute right-0 top-full mt-1.5 z-[9999] w-72 rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
            <div className="border-b border-zinc-100 dark:border-zinc-800 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Filtros</p>
            </div>

            {/* Active filters */}
            {sessionFilters.length > 0 && (
              <div className="border-b border-zinc-100 dark:border-zinc-800 p-2 space-y-1">
                {sessionFilters.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                    <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 truncate flex-1">
                      <b>{f.column}</b>{" "}
                      {OPERATORS.find((o) => o.value === f.operator)?.label}{" "}
                      {!NO_VALUE_OPS.has(f.operator) && <b>{f.value}</b>}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFilter(f.id)}
                      className="shrink-0 text-blue-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add filter form */}
            <div className="p-3 space-y-2">
              <select
                value={nfCol}
                onChange={(e) => setNfCol(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {columns.length === 0 && <option value="">Sin columnas</option>}
                {columns.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select
                value={nfOp}
                onChange={(e) => setNfOp(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                {OPERATORS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              {!NO_VALUE_OPS.has(nfOp) && (
                <input
                  type="text"
                  value={nfVal}
                  onChange={(e) => setNfVal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addFilter()}
                  placeholder="Valor…"
                  className="w-full rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                />
              )}
              <button
                type="button"
                onClick={addFilter}
                disabled={columns.length === 0}
                className="w-full rounded-lg bg-blue-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40"
              >
                + Agregar filtro
              </button>
              {sessionFilters.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionFilters([])}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-1.5 text-[11px] font-medium text-zinc-500 hover:bg-zinc-50 transition-colors dark:border-zinc-700 dark:hover:bg-zinc-800"
                >
                  Limpiar todos
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── PROPERTIES DROPDOWN ── */}
        {open === "properties" && (
          <div className="absolute right-0 top-full mt-1.5 z-[9999] w-56 rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-3 py-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Propiedades</p>
              {sessionHidden.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSessionHidden([])}
                  className="text-[10px] text-blue-500 hover:text-blue-600 font-medium"
                >
                  Mostrar todo
                </button>
              )}
            </div>
            <div className="p-2 max-h-60 overflow-y-auto space-y-0.5">
              {columns.length === 0 && (
                <p className="text-[11px] text-zinc-400 text-center py-3">Sin columnas cargadas</p>
              )}
              {columns.map((col) => {
                const hidden = sessionHidden.includes(col);
                return (
                  <button
                    key={col}
                    type="button"
                    onClick={() => toggleHidden(col)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <span className={`text-[11px] truncate ${hidden ? "text-zinc-400 line-through" : "text-zinc-700 dark:text-zinc-300"}`}>
                      {col}
                    </span>
                    {/* Toggle eye */}
                    <span className={`shrink-0 transition-colors ${hidden ? "text-zinc-300 dark:text-zinc-600" : "text-blue-500"}`}>
                      {hidden ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
