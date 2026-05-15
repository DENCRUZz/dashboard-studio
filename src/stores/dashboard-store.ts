"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type DashboardStateShape,
  type DashboardWidget,
  type DisplayConfig,
  type SupabaseConnection,
  type FilterGroup,
  defaultDisplay,
  defaultLayout,
  mergeDisplay,
} from "@/lib/types";
import { invalidateConnectionCache } from "@/lib/supabase-clients";

export type WidgetPatch = {
  title?: string;
  connectionId?: string;
  source?: DashboardWidget["source"];
  layout?: Partial<DashboardWidget["layout"]>;
  display?: Partial<DisplayConfig>;
  activeViewId?: string;
};

type Store = {
  connections: SupabaseConnection[];
  dashboard: DashboardStateShape;
  editing: boolean;
  setEditing: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  setDashboardName: (name: string) => void;
  addConnection: (c: Omit<SupabaseConnection, "id">) => string;
  updateConnection: (id: string, patch: Partial<SupabaseConnection>) => void;
  removeConnection: (id: string) => void;
  addWidget: (w?: Partial<DashboardWidget>) => string;
  updateWidget: (id: string, patch: WidgetPatch) => void;
  removeWidget: (id: string) => void;
  moveWidgetToPos: (id: string, x: number, y: number) => void;
  

  importFullState: (raw: string) => { ok: true } | { ok: false; error: string };
  exportFullState: () => string;
  reset: () => void;
};

const newId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const defaultTableSource = (): DashboardWidget["source"] => ({
  kind: "table",
  table: "",
  select: "*",
  filters: [],
  advancedFilters: { operator: "and", rules: [] },
  limit: 200,
});

function defaultWidget(
  connectionId: string | undefined,
  connections: SupabaseConnection[],
): DashboardWidget {
  const connId = connectionId ?? connections[0]?.id ?? "";
  return {
    id: newId(),
    title: "Nuevo bloque",
    connectionId: connId,
    source: defaultTableSource(),
    display: defaultDisplay(),
    layout: { x: 0, y: 0, colSpan: 6, rowSpan: 4 },
    views: [],
  };
}

const initialDashboard: DashboardStateShape = {
  name: "Mi tablero",
  widgets: [],
};

export const useDashboardStore = create<Store>()(
  persist(
    (set, get) => ({
      connections: [],
      dashboard: initialDashboard,
      editing: false,
      setEditing: (v) => set({ editing: v }),
      sidebarOpen: false,
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      setDashboardName: (name) =>
        set((s) => ({ dashboard: { ...s.dashboard, name } })),

      addConnection: (c) => {
        const id = newId();
        set((s) => ({
          connections: [...s.connections, { ...c, id }],
        }));
        return id;
      },
      updateConnection: (id, patch) => {
        invalidateConnectionCache(id);
        set((s) => ({
          connections: s.connections.map((x) =>
            x.id === id ? { ...x, ...patch, id } : x,
          ),
        }));
      },
      removeConnection: (id) => {
        invalidateConnectionCache(id);
        set((s) => {
          const remaining = s.connections.filter((c) => c.id !== id);
          const fallback = remaining[0]?.id ?? "";
          return {
            connections: remaining,
            dashboard: {
              ...s.dashboard,
              widgets: s.dashboard.widgets.map((w) =>
                w.connectionId === id ? { ...w, connectionId: fallback } : w,
              ),
            },
          };
        });
      },

      addWidget: (partial) => {
        const id = newId();
        const base = defaultWidget(partial?.connectionId, get().connections);
        const w: DashboardWidget = {
          ...base,
          ...partial,
          id,
          source: partial?.source ?? base.source,
          display: { ...base.display, ...partial?.display },
          layout: { ...base.layout, ...partial?.layout },
          views: partial?.views ?? [],
        };
        set((s) => ({
          dashboard: {
            ...s.dashboard,
            widgets: [...s.dashboard.widgets, w],
          },
        }));
        return id;
      },
      updateWidget: (id, patch) =>
        set((s) => ({
          dashboard: {
            ...s.dashboard,
            widgets: s.dashboard.widgets.map((w) => {
              if (w.id !== id) return w;
              const { display: dp, layout: lo, ...rest } = patch;
              const merged: DashboardWidget = {
                ...w,
                ...rest,
              };
              if (lo) {
                merged.layout = { ...w.layout, ...lo };
              }
              if (dp) {
                merged.display = { ...mergeDisplay(w.display), ...dp };
              }
              return merged;
            }),
          },
        })),
      removeWidget: (id) =>
        set((s) => ({
          dashboard: {
            ...s.dashboard,
            widgets: s.dashboard.widgets.filter((w) => w.id !== id),
          },
        })),
      moveWidgetToPos: (id, x, y) =>
        set((s) => ({
          dashboard: {
            ...s.dashboard,
            widgets: s.dashboard.widgets.map((w) =>
              w.id === id ? { ...w, layout: { ...w.layout, x, y } } : w
            ),
          },
        })),


      importFullState: (raw) => {
        try {
          const data = JSON.parse(raw) as unknown;
          if (!data || typeof data !== "object") {
            return { ok: false, error: "JSON inválido" };
          }
          const d = data as {
            connections?: SupabaseConnection[];
            dashboard?: DashboardStateShape;
          };
          if (!Array.isArray(d.connections) || !d.dashboard?.widgets) {
            return { ok: false, error: "Formato no reconocido" };
          }
          set({
            connections: d.connections,
            dashboard: {
              name: d.dashboard.name ?? "Importado",
              widgets: d.dashboard.widgets,
            },
          });
          return { ok: true };
        } catch {
          return { ok: false, error: "No se pudo leer el archivo" };
        }
      },
      exportFullState: () => {
        const s = get();
        return JSON.stringify(
          { connections: s.connections, dashboard: s.dashboard },
          null,
          2,
        );
      },
      reset: () =>
        set({
          connections: [],
          dashboard: initialDashboard,
          editing: false,
        }),
    }),
    {
      name: "dashboard-studio-v1",
      partialize: (s) => ({
        connections: s.connections,
        dashboard: s.dashboard,
        sidebarOpen: s.sidebarOpen,
      }),
      merge: (persistedState: any, currentState) => {
        const s = persistedState as Store;
        if (!s || !s.dashboard) return currentState;
        // Migration: Ensure widgets have views and valid sources
        s.dashboard.widgets.forEach(w => {
          if (!w.views) w.views = [];
          if (w.source.kind === "table") {
            if (w.source.table === undefined) w.source.table = "";
            if (!w.source.advancedFilters) w.source.advancedFilters = { operator: "and", rules: [] };
          } else if (w.source.kind === "rpc") {
            if (w.source.functionName === undefined) w.source.functionName = "";
            if (!w.source.args) w.source.args = {};
          }
        });
        return { ...currentState, ...s };
      },
    },
  ),
);
