/** Supabase project connection (stored locally; use only in trusted environments). */
export type SupabaseConnection = {
  id: string;
  name: string;
  url: string;
  anonKey: string;
};

export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "is"
  | "in"
  | "contains"
  | "not.contains"
  | "is_empty"
  | "is_not_empty";

export type RowFilter = {
  column: string;
  operator: FilterOperator;
  /** For `is`, use null | boolean. Supports variables like {hoy}. */
  value: any;
  /** 
   * "fixed" (manual input), 
   * "relative" (last X days), 
   * "variable" ({hoy}, etc) 
   */
  valueType?: "fixed" | "relative" | "variable";
};

export type FilterGroup = {
  operator: "and" | "or";
  rules: (RowFilter | FilterGroup)[];
};

/** Conditional formatting rule */
export type ColorRule = {
  column: string;
  operator: FilterOperator;
  value: any;
  colorBackground?: string;
  colorText?: string;
};

/** A saved configuration snapshot for a widget */
export type WidgetView = {
  id: string;
  name: string;
  filters: FilterGroup;
  display: Partial<DisplayConfig>;
};

/** How rows are loaded from PostgREST / Supabase. */
export type TableDataSource = {
  kind: "table";
  schema?: string;
  table: string;
  select: string;
  /** Main filters (ANDed at top level) */
  filters: RowFilter[];
  /** NEW: Advanced nested filters */
  advancedFilters?: FilterGroup;
  orderBy?: { column: string; ascending: boolean };
  limit: number;
};

export type RpcDataSource = {
  kind: "rpc";
  functionName: string;
  args: Record<string, unknown>;
  filters: RowFilter[];
  advancedFilters?: FilterGroup;
};

export type DataSource = TableDataSource | RpcDataSource;

export type AggregateMode =
  | "first"
  | "count"
  | "sum"
  | "avg"
  | "min"
  | "max"
  | "count_rows";

export type VisualizationKind =
  | "kpi"
  | "table"
  | "bar"
  | "line"
  | "pie"
  | "cards";

export type NumberFormatStyle =
  | "decimal"
  | "integer"
  | "currency"
  | "accounting"
  | "percent";

export type TimeGroupDimension =
  | "none"
  | "day"
  | "week"
  | "month"
  | "quarter"
  | "year";

export type CustomColumn = {
  id: string;
  header: string;
  expression: string;
};

export type ColumnFormatConfig = {
  style: NumberFormatStyle;
  minFractionDigits?: number;
  maxFractionDigits?: number;
  currencyCode?: string;
};

export type DisplayConfig = {
  visualization: VisualizationKind;
  valueField?: string;
  labelField?: string;
  aggregate: AggregateMode;
  categoryField?: string;
  seriesField?: string;
  hiddenColumns: string[];
  columnFormats: Record<string, ColumnFormatConfig>;
  cardTitleField?: string;
  cardSubtitleField?: string;
  cardProperties: string[];
  compactNumbers: boolean;

  numberFormatStyle: NumberFormatStyle;
  currencyCode: string;
  minFractionDigits?: number;
  maxFractionDigits?: number;

  groupTimeBy: TimeGroupDimension;
  dateField?: string;
  groupByField?: string;

  colorBackground?: string;
  colorText?: string;
  colorAccent?: string;

  showTotalRow: boolean;
  totalColumns: string[];

  /** NEW: Conditional coloring rules */
  colorRules: ColorRule[];
  /** NEW: Enable inline search */
  enableSearch: boolean;
  /** NEW: Custom columns with JS logic */
  customColumns: CustomColumn[];
  /** NEW: UI-level sorting */
  orderBy?: { column: string; ascending: boolean };
};

export type WidgetLayout = {
  x: number;
  y: number;
  colSpan: number;
  rowSpan: number;
};

export type DashboardWidget = {
  id: string;
  title: string;
  connectionId: string;
  source: DataSource;
  display: DisplayConfig;
  layout: WidgetLayout;
  /** NEW: Saved views */
  views: WidgetView[];
  activeViewId?: string;
};

export type DashboardStateShape = {
  name: string;
  widgets: DashboardWidget[];
  /** NEW: Global filters shared by all widgets */
  globalFilters: FilterGroup;
};

export const defaultDisplay = (): DisplayConfig => ({
  visualization: "table",
  aggregate: "first",
  hiddenColumns: [],
  columnFormats: {},
  cardProperties: [],
  compactNumbers: true,
  numberFormatStyle: "decimal",
  currencyCode: "USD",
  groupTimeBy: "none",
  colorBackground: undefined,
  colorText: undefined,
  colorAccent: undefined,
  showTotalRow: false,
  totalColumns: [],
  colorRules: [],
  enableSearch: false,
  customColumns: [],
});

export function mergeDisplay(
  d: Partial<DisplayConfig> | DisplayConfig,
): DisplayConfig {
  return { ...defaultDisplay(), ...d };
}

export const defaultLayout = (): WidgetLayout => ({
  colSpan: 2,
  rowSpan: 1,
});
