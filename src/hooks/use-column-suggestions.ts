"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchTableSample,
  unionRowKeys,
} from "@/lib/fetch-table-columns";
import type { ConnectionCredentials } from "@/lib/supabase-clients";
import type { DashboardWidget } from "@/lib/types";
import { useDebouncedValue } from "./use-debounced-value";

export function useColumnSuggestions(
  widget: DashboardWidget,
  activeConnection: ConnectionCredentials | undefined,
  rpcPreviewRows: Record<string, unknown>[] | null,
) {
  const [tableCols, setTableCols] = useState<string[]>([]);
  const [tableRows, setTableRows] = useState<Record<string, unknown>[]>([]);
  const [tableColsLoading, setTableColsLoading] = useState(false);

  const tableKey =
    widget.source.kind === "table"
      ? JSON.stringify({
          s: widget.source.schema ?? "public",
          t: widget.source.table.trim(),
        })
      : "";

  const debouncedTableKey = useDebouncedValue(tableKey, 450);

  useEffect(() => {
    if (widget.source.kind !== "table") {
      setTableCols([]);
      setTableRows([]);
      setTableColsLoading(false);
      return;
    }
    if (!activeConnection) {
      setTableCols([]);
      setTableRows([]);
      setTableColsLoading(false);
      return;
    }
    if (!debouncedTableKey) {
      setTableCols([]);
      setTableRows([]);
      setTableColsLoading(false);
      return;
    }

    const { s, t } = JSON.parse(debouncedTableKey) as { s: string; t: string };
    if (!t) {
      setTableCols([]);
      setTableRows([]);
      setTableColsLoading(false);
      return;
    }

    let cancelled = false;
    setTableColsLoading(true);
    fetchTableSample(
      activeConnection,
      s === "public" ? undefined : s,
      t,
    ).then(({ columns, rows }) => {
      if (!cancelled) {
        setTableCols(columns);
        setTableRows(rows);
        setTableColsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [widget.source.kind, activeConnection?.id, debouncedTableKey]);

  const rpcCols = useMemo(
    () => (rpcPreviewRows?.length ? unionRowKeys(rpcPreviewRows) : []),
    [rpcPreviewRows],
  );

  const suggestions = useMemo(() => {
    if (widget.source.kind === "rpc") return rpcCols;
    return tableCols;
  }, [widget.source.kind, rpcCols, tableCols]);

  return { suggestions, tableColsLoading, sampleRows: tableRows };
}
