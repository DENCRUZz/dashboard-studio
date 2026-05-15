"use client";

import { useMemo } from "react";

/** `datalist` nativos para autocompletado de nombres de columna (referenciar con `list={columnListId}`). */
export function ColumnDatalists({
  columnListId,
  selectListId,
  columnNames,
}: {
  columnListId: string;
  selectListId: string;
  columnNames: string[];
}) {
  const uniq = useMemo(
    () => [...new Set(columnNames)].sort((a, b) => a.localeCompare(b)),
    [columnNames],
  );

  return (
    <>
      <datalist id={columnListId}>
        {uniq.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <datalist id={selectListId}>
        <option value="*" />
        {uniq.map((c) => (
          <option key={`s-${c}`} value={c} />
        ))}
      </datalist>
    </>
  );
}
