"use client";

import { useRef, useState, type ChangeEventHandler } from "react";
import { ConnectionsPanel } from "@/components/connections-panel";
import { WidgetInspector } from "@/components/widget-inspector";
import { WidgetView } from "@/components/widget-view";
import { useDashboardStore } from "@/stores/dashboard-store";

const colClass = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
} as const;

const rowMinClass = {
  1: "min-h-[140px]",
  2: "min-h-[220px]",
  3: "min-h-[300px]",
  4: "min-h-[380px]",
} as const;

export function DashboardShell() {
  const dashboard = useDashboardStore((s) => s.dashboard);
  const editing = useDashboardStore((s) => s.editing);
  const setEditing = useDashboardStore((s) => s.setEditing);
  const setDashboardName = useDashboardStore((s) => s.setDashboardName);
  const connections = useDashboardStore((s) => s.connections);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const moveWidget = useDashboardStore((s) => s.moveWidget);
  const exportFullState = useDashboardStore((s) => s.exportFullState);
  const importFullState = useDashboardStore((s) => s.importFullState);
  const clearGlobalFilters = useDashboardStore((s) => s.clearGlobalFilters);

  const [inspectId, setInspectId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const inspected = dashboard.widgets.find((w) => w.id === inspectId);

  const handleImport: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const r = importFullState(text);
      if (!r.ok) alert(r.error);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-72' : 'w-0'} overflow-hidden border-r border-zinc-200 dark:border-zinc-800`}>
        <div className="w-72">
          <ConnectionsPanel />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            title={isSidebarOpen ? "Ocultar Conexiones" : "Mostrar Conexiones"}
          >
            <svg className={`h-4 w-4 transition-transform ${isSidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>

          {editing ? (
            <input
              className="min-w-[12rem] flex-1 rounded-md border border-zinc-200 bg-white px-2 py-1 text-lg font-semibold dark:border-zinc-800 dark:bg-zinc-950"
              value={dashboard.name}
              onChange={(e) => setDashboardName(e.target.value)}
            />
          ) : (
            <h1 className="text-lg font-semibold">{dashboard.name}</h1>
          )}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                editing
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {editing ? "Modo edición" : "Solo lectura"}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => addWidget()}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  + Bloque
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const blob = new Blob([exportFullState()], {
                      type: "application/json",
                    });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "dashboard-studio-export.json";
                    a.click();
                    URL.revokeObjectURL(a.href);
                  }}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  Exportar
                </button>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
                >
                  Importar
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={handleImport}
                />
              </>
            )}
          </div>
        </header>

        <div className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-md bg-white px-2 py-1 text-xs font-medium shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-800">
              <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span>Filtros Globales</span>
            </div>
            
            {dashboard.globalFilters?.rules && dashboard.globalFilters.rules.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1">
                  {dashboard.globalFilters.rules.map((r: any, i: number) => (
                    <span key={i} className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                      {r.column} {r.operator} {String(r.value)}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => clearGlobalFilters()}
                  className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-red-600 hover:underline dark:text-red-400"
                >
                  Limpiar y restaurar
                </button>
              </>
            ) : (
              <p className="text-[10px] text-zinc-400">Sin filtros activos. Afectan a todos los bloques.</p>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto p-4">
          {dashboard.widgets.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              {editing
                ? "Añade una conexión a la izquierda y pulsa «+ Bloque» para montar tu tablero."
                : "No hay bloques en este tablero."}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dashboard.widgets.map((w, index) => {
              const conn = connections.find((c) => c.id === w.connectionId);
              return (
                <section
                  key={w.id}
                  className={`rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950 ${colClass[w.layout.colSpan]} ${rowMinClass[w.layout.rowSpan]}`}
                  style={{
                    backgroundColor: w.display.colorBackground,
                    color: w.display.colorText,
                  }}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 
                        className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                        style={{ color: w.display.colorText }}
                      >
                        {w.title}
                      </h2>
                      {conn && (
                        <p 
                          className="truncate text-xs text-zinc-500"
                          style={{ color: w.display.colorText ? `${w.display.colorText}cc` : undefined }}
                        >
                          {conn.name}
                        </p>
                      )}
                    </div>
                    {editing && (
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded px-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                            onClick={() => moveWidget(w.id, "up")}
                            disabled={index === 0}
                            aria-label="Subir"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded px-1.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"
                            onClick={() => moveWidget(w.id, "down")}
                            disabled={index === dashboard.widgets.length - 1}
                            aria-label="Bajar"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="text-xs font-medium text-zinc-700 underline dark:text-zinc-300"
                            onClick={() => setInspectId(w.id)}
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            className="text-xs text-red-600"
                            onClick={() => removeWidget(w.id)}
                          >
                            Quitar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <WidgetView widget={w} connection={conn} />
                </section>
              );
            })}
          </div>
        </main>
      </div>

      {inspected && (
        <WidgetInspector
          key={inspected.id}
          widget={inspected}
          onClose={() => setInspectId(null)}
        />
      )}
    </div>
  );
}
