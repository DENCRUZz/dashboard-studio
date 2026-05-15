"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useDashboardStore } from "@/stores/dashboard-store";

export function ConnectionsPanel() {
  const connections = useDashboardStore((s) => s.connections);
  const addConnection = useDashboardStore((s) => s.addConnection);
  const updateConnection = useDashboardStore((s) => s.updateConnection);
  const removeConnection = useDashboardStore((s) => s.removeConnection);

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [testing, setTesting] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const handleAdd = () => {
    if (!name.trim() || !url.trim() || !anonKey.trim()) return;
    addConnection({ name: name.trim(), url: url.trim(), anonKey: anonKey.trim() });
    setName("");
    setUrl("");
    setAnonKey("");
  };

  const testConnection = async (id: string, u: string, key: string) => {
    setTesting(id);
    setTestMsg(null);
    try {
      const client = createClient(u.trim(), key.trim(), {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error } = await client.auth.getSession();
      if (error) {
        setTestMsg(error.message);
        setTesting(null);
        return;
      }
      setTestMsg("Conexión OK (API alcanzable).");
    } catch (e) {
      setTestMsg(e instanceof Error ? e.message : "Error");
    }
    setTesting(null);
  };

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="border-b border-zinc-200 px-3 py-3 dark:border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Conexiones Supabase
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          URL del proyecto y clave anon. Se guardan en este navegador.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-900">
          <input
            className="w-full rounded border border-zinc-200 px-2 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-200 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="https://xxx.supabase.co"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <input
            className="w-full rounded border border-zinc-200 px-2 py-1 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="anon key"
            type="password"
            autoComplete="off"
            value={anonKey}
            onChange={(e) => setAnonKey(e.target.value)}
          />
          <button
            type="button"
            onClick={handleAdd}
            className="w-full rounded-md bg-zinc-900 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Guardar conexión
          </button>
        </div>

        <ul className="mt-4 space-y-2">
          {connections.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-zinc-200 bg-white p-2 text-xs dark:border-zinc-800 dark:bg-zinc-900"
            >
              <input
                className="w-full border-b border-transparent bg-transparent py-0.5 font-medium outline-none focus:border-zinc-300"
                value={c.name}
                onChange={(e) =>
                  updateConnection(c.id, { name: e.target.value })
                }
              />
              <input
                className="mt-1 w-full font-mono text-[10px] text-zinc-500"
                value={c.url}
                onChange={(e) =>
                  updateConnection(c.id, { url: e.target.value })
                }
              />
              <input
                className="mt-1 w-full font-mono text-[10px] text-zinc-500"
                type="password"
                value={c.anonKey}
                onChange={(e) =>
                  updateConnection(c.id, { anonKey: e.target.value })
                }
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  className="text-[11px] text-zinc-600 underline dark:text-zinc-400"
                  disabled={testing === c.id}
                  onClick={() => testConnection(c.id, c.url, c.anonKey)}
                >
                  {testing === c.id ? "Probando…" : "Probar"}
                </button>
                <button
                  type="button"
                  className="text-[11px] text-red-600"
                  onClick={() => removeConnection(c.id)}
                >
                  Eliminar
                </button>
              </div>
            </li>
          ))}
        </ul>
        {testMsg && (
          <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{testMsg}</p>
        )}
      </div>
    </aside>
  );
}
