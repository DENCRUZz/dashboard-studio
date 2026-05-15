import {
  type ConnectionCredentials,
  getSupabaseForConnection,
} from "./supabase-clients";

/** Une las claves de varias filas (p. ej. respuesta RPC). */
export function unionRowKeys(rows: Record<string, unknown>[]): string[] {
  const s = new Set<string>();
  for (const r of rows) {
    Object.keys(r).forEach((k) => s.add(k));
  }
  return [...s].sort((a, b) => a.localeCompare(b));
}

/** Infiere columnas leyendo filas de muestra. Devuelve nombres de columnas y las filas encontradas. */
export async function fetchTableSample(
  conn: ConnectionCredentials,
  schema: string | undefined,
  table: string,
): Promise<{ columns: string[]; rows: Record<string, unknown>[] }> {
  const t = table.trim();
  if (!t) return { columns: [], rows: [] };

  const client = getSupabaseForConnection(conn);
  const sch = schema ?? "public";
  const q =
    sch === "public"
      ? client.from(t).select("*").limit(5)
      : client.schema(sch).from(t).select("*").limit(5);

  const { data, error } = await q;
  if (error || !data?.length) return { columns: [], rows: [] };

  const rows = data as Record<string, unknown>[];
  return {
    columns: unionRowKeys(rows),
    rows,
  };
}
