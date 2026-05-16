"use client";

import { useRef, useState, useEffect, type ChangeEventHandler } from "react";
import { type WidgetLayout } from "@/lib/types";
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

function ViewSelector({ widget }: { widget: any }) {
  const applyView = useDashboardStore(s => s.applyWidgetView);
  if (!widget.views || widget.views.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-bold uppercase text-zinc-400">Vista:</span>
      <select
        className="rounded border border-zinc-200 bg-white/50 px-1.5 py-0.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-900/50"
        value={widget.activeViewId || ""}
        onChange={(e) => applyView(widget.id, e.target.value)}
      >
        {widget.views.map((v: any) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>
    </div>
  );
}

export function DashboardShell() {
  const dashboard = useDashboardStore((s) => s.dashboard);
  const editing = useDashboardStore((s) => s.editing);
  const setEditing = useDashboardStore((s) => s.setEditing);
  const setDashboardName = useDashboardStore((s) => s.setDashboardName);
  const connections = useDashboardStore((s) => s.connections);
  const addWidget = useDashboardStore((s) => s.addWidget);
  const updateWidget = useDashboardStore((s) => s.updateWidget);
  const removeWidget = useDashboardStore((s) => s.removeWidget);
  const moveWidgetToPos = useDashboardStore((s) => s.moveWidgetToPos);
  const exportFullState = useDashboardStore((s) => s.exportFullState);
  const importFullState = useDashboardStore((s) => s.importFullState);

  const sidebarOpen = useDashboardStore((s) => s.sidebarOpen);
  const setSidebarOpen = useDashboardStore((s) => s.setSidebarOpen);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveInitial, setMoveInitial] = useState<{ mouseX: number; mouseY: number; initialX: number; initialY: number } | null>(null);
  const [resizingId, setResizingId] = useState<string | null>(null);
  const [resizeInitial, setResizeInitial] = useState<{ x: number; y: number; colSpan: number; rowSpan: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 768px)");
    const handleQuery = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    
    handleQuery(mediaQuery);
    mediaQuery.addEventListener("change", handleQuery);
    return () => mediaQuery.removeEventListener("change", handleQuery);
  }, []);

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

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedId(null);
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent, widgetId: string, layout: WidgetLayout) => {
    e.stopPropagation();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setResizingId(widgetId);
    setResizeInitial({
      x: clientX,
      y: clientY,
      colSpan: layout.colSpan,
      rowSpan: layout.rowSpan,
    });
  };

  useEffect(() => {
    if (!resizingId && !movingId) return;

    const handleEnd = () => {
      setResizingId(null);
      setResizeInitial(null);
      setMovingId(null);
      setMoveInitial(null);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (resizingId && resizeInitial) {
        const grid = gridRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const colWidth = (rect.width - (11 * 24)) / 12;
        const rowHeight = 60;
        const gap = 24;

        const deltaX = e.clientX - resizeInitial.x;
        const deltaY = e.clientY - resizeInitial.y;

        const newColSpan = Math.max(1, Math.min(12, Math.round(resizeInitial.colSpan + deltaX / (colWidth + gap))));
        const newRowSpan = Math.max(1, Math.round(resizeInitial.rowSpan + deltaY / (rowHeight + gap)));

        updateWidget(resizingId, { layout: { colSpan: newColSpan, rowSpan: newRowSpan } });
      }

      if (movingId && moveInitial) {
        const grid = gridRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const colWidth = (rect.width - (11 * 24)) / 12;
        const rowHeight = 60;
        const gap = 24;

        const deltaX = e.clientX - moveInitial.mouseX;
        const deltaY = e.clientY - moveInitial.mouseY;

        const newX = Math.max(0, Math.min(11, Math.round(moveInitial.initialX + deltaX / (colWidth + gap))));
        const newY = Math.max(0, Math.round(moveInitial.initialY + deltaY / (rowHeight + gap)));

        moveWidgetToPos(movingId, newX, newY);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (resizingId && resizeInitial) {
        e.preventDefault(); // Prevent scroll while resizing
        const grid = gridRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const colWidth = (rect.width - (11 * 24)) / 12;
        const rowHeight = 60;
        const gap = 24;

        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        const deltaX = clientX - resizeInitial.x;
        const deltaY = clientY - resizeInitial.y;

        const newColSpan = Math.max(1, Math.min(12, Math.round(resizeInitial.colSpan + deltaX / (colWidth + gap))));
        const newRowSpan = Math.max(1, Math.round(resizeInitial.rowSpan + deltaY / (rowHeight + gap)));

        updateWidget(resizingId, { layout: { colSpan: newColSpan, rowSpan: newRowSpan } });
      }

      if (movingId && moveInitial) {
        e.preventDefault(); // Prevent scroll while moving
        const grid = gridRef.current;
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const colWidth = (rect.width - (11 * 24)) / 12;
        const rowHeight = 60;
        const gap = 24;

        const clientX = e.touches[0].clientX;
        const clientY = e.touches[0].clientY;

        const deltaX = clientX - moveInitial.mouseX;
        const deltaY = clientY - moveInitial.mouseY;

        const newX = Math.max(0, Math.min(11, Math.round(moveInitial.initialX + deltaX / (colWidth + gap))));
        const newY = Math.max(0, Math.round(moveInitial.initialY + deltaY / (rowHeight + gap)));

        moveWidgetToPos(movingId, newX, newY);
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleEnd);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [resizingId, resizeInitial, movingId, moveInitial, updateWidget, moveWidgetToPos]);

  const handleMoveStart = (e: React.MouseEvent | React.TouchEvent, widgetId: string, layout: WidgetLayout) => {
    if (!editing) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    setMovingId(widgetId);
    setMoveInitial({
      mouseX: clientX,
      mouseY: clientY,
      initialX: layout.x,
      initialY: layout.y,
    });
  };

  return (
    <div className={`flex flex-1 overflow-hidden ${editing ? 'editing-mode' : ''}`}>
      <div className={`transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-72' : 'w-0'} overflow-hidden border-r border-zinc-200 dark:border-zinc-800`}>
        <div className="w-72">
          <ConnectionsPanel />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col relative">
        {editing && <div className="grid-canvas absolute inset-0 pointer-events-none z-0" />}
        
        <header className="relative z-10 flex flex-wrap items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            title={sidebarOpen ? "Ocultar Conexiones" : "Mostrar Conexiones"}
          >
            <svg className={`h-4 w-4 transition-transform ${sidebarOpen ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
                editing
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                  : "border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              }`}
            >
              {editing ? "Finalizar Edición" : "Personalizar Tablero"}
            </button>
            {editing && (
              <>
                <button
                  type="button"
                  onClick={() => addWidget()}
                  className="rounded-md bg-white border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:border-zinc-700"
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


        <main 
          className="relative z-10 flex-1 overflow-y-auto p-6"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleGridDrop}
        >
          {dashboard.widgets.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              {editing
                ? "Arrastra conexiones aquí y pulsa «+ Bloque» para comenzar el diseño."
                : "No hay bloques en este tablero."}
            </div>
          )}

          <div 
            ref={gridRef}
            className="grid grid-cols-2 md:grid-cols-12 gap-4 md:gap-6 [grid-auto-rows:60px]"
          >
            {dashboard.widgets.map((w) => {
              const conn = connections.find((c) => c.id === w.connectionId);
              const isDragging = draggedId === w.id;
              const showHeader = !w.display.hideHeader;
              const headerOverlay = showHeader === false && editing;

              return (
                <section
                  key={w.id}
                  className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 md:p-5 shadow-sm transition-all duration-200 dark:border-zinc-800 dark:bg-zinc-950 
                    ${isDragging ? 'opacity-20 scale-95' : 'opacity-100'} 
                    ${editing ? 'hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30' : ''}
                    ${w.layout.mobileWidth === 'full' ? 'col-span-2' : 'col-span-1'}
                  `}
                  style={{
                    gridColumnStart: isMobile ? undefined : (w.layout.x ?? 0) + 1,
                    gridRowStart: isMobile ? undefined : (w.layout.y ?? 0) + 1,
                    gridColumnEnd: isMobile ? undefined : `span ${w.layout.colSpan || 6}`,
                    gridRowEnd: isMobile 
                      ? `span ${w.layout.mobileRowSpan || w.layout.rowSpan || 4}` 
                      : `span ${w.layout.rowSpan || 4}`,
                    backgroundColor: w.display.colorBackground,
                    color: w.display.colorText,
                  }}
                >
                  {(showHeader || headerOverlay) && (
                    <div 
                      className={`flex items-start justify-between gap-3 ${editing ? 'cursor-move' : ''} ${headerOverlay ? 'absolute top-3 left-3 right-3 z-50 bg-white/90 p-3 rounded-xl shadow-md backdrop-blur dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800' : 'mb-4'}`}
                      onMouseDown={(e) => handleMoveStart(e, w.id, w.layout)}
                      onTouchStart={(e) => handleMoveStart(e, w.id, w.layout)}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {editing && (
                            <div 
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 shadow-sm dark:bg-zinc-900 dark:text-zinc-400"
                              title="Arrastrar para mover"
                            >
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            </div>
                          )}
                          <h2 
                            className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100 whitespace-normal leading-tight"
                            style={{ color: w.display.colorText }}
                          >
                            {w.title}
                          </h2>
                        </div>
                        {conn && (
                          <p 
                            className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider text-zinc-400"
                            style={{ color: w.display.colorText ? `${w.display.colorText}aa` : undefined }}
                          >
                            {conn.name}
                          </p>
                        )}
                        <div className="mt-1" onMouseDown={e => e.stopPropagation()}>
                          <ViewSelector widget={w} />
                        </div>
                      </div>
                      {editing && (
                        <div className="flex shrink-0 items-center gap-1.5 opacity-100 md:opacity-0 transition-opacity group-hover:opacity-100" onMouseDown={e => e.stopPropagation()}>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-blue-900/30"
                            onClick={() => setInspectId(w.id)}
                            title="Configurar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37a1.724 1.724 0 002.572-1.065z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                            onClick={() => removeWidget(w.id)}
                            title="Eliminar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className="flex-1 min-h-0 relative flex flex-col">
                    <WidgetView widget={w} connection={conn} />
                  </div>

                  {editing && (
                    <div 
                      className="absolute bottom-0 right-0 w-8 h-8 cursor-nwse-resize flex items-center justify-center group/resize z-30 touch-none"
                      onMouseDown={(e) => handleResizeStart(e, w.id, w.layout)}
                      onTouchStart={(e) => handleResizeStart(e, w.id, w.layout)}
                    >
                      <div className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover/resize:bg-blue-500 transition-colors" />
                    </div>
                  )}
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
