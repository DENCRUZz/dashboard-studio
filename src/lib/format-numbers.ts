import type { DisplayConfig } from "./types";
import { mergeDisplay } from "./types";

export function formatDisplayNumber(
  value: number,
  partialDisplay: Partial<DisplayConfig> | DisplayConfig,
  columnName?: string,
): string {
  const d = mergeDisplay(partialDisplay);
  
  // Per-column format overrides global format
  const colFormat = columnName ? d.columnFormats?.[columnName] : null;
  
  const style = colFormat?.style ?? d.numberFormatStyle;
  const currencyCode = colFormat?.currencyCode ?? d.currencyCode;
  const minF = colFormat?.minFractionDigits ?? d.minFractionDigits;
  const maxF = colFormat?.maxFractionDigits ?? d.maxFractionDigits;
  const compact = colFormat ? false : d.compactNumbers; // Don't compact if custom format set

  if (!Number.isFinite(value)) return "—";

  if (compact && Math.abs(value) >= 1000 && style === "decimal") {
    return new Intl.NumberFormat(undefined, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }

  const digits = {
    minimumFractionDigits: minF,
    maximumFractionDigits: maxF,
  };

  switch (style) {
    case "integer":
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 0,
      }).format(Math.round(value));
    case "percent":
      return new Intl.NumberFormat(undefined, {
        style: "percent",
        minimumFractionDigits: minF ?? 0,
        maximumFractionDigits: maxF ?? 2,
      }).format(value);
    case "currency":
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode || "USD",
        minimumFractionDigits: minF,
        maximumFractionDigits: maxF,
      }).format(value);
    case "accounting":
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyCode || "USD",
          currencySign: "accounting",
          minimumFractionDigits: minF ?? 2,
          maximumFractionDigits: maxF ?? 2,
        }).format(value);
      } catch {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: currencyCode || "USD",
          minimumFractionDigits: minF,
          maximumFractionDigits: maxF,
        }).format(value);
      }
    case "decimal":
    default:
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: minF,
        maximumFractionDigits: maxF,
      }).format(value);
  }
}
