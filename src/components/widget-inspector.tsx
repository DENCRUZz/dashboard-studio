"use client";

import React, { useMemo, useState } from "react";
import { useDashboardStore, type WidgetPatch } from "@/stores/dashboard-store";
import {
  type DashboardWidget,
  type FilterOperator,
  type RowFilter,
  type FilterGroup,
  type ColorRule,
  mergeDisplay,
  type DisplayConfig,
  type AggregateMode,
  type VisualizationKind,
  type TimeGroupDimension,
  type ColumnFormatConfig,
  type CustomColumn,
} from "@/lib/types";
import { useColumnSuggestions } from "@/hooks/use-column-suggestions";

// --- Helper Components ---

function FilterGroupEditor({
  group,
  columns,
  onChange,
  onRemove,
  isRoot = false
}: {
  group: FilterGroup;
  columns: string[];
  onChange: (g: FilterGroup) => void;
  onRemove?: () => void;
  isRoot?: boolean;
}) {
  const addRule = () => {
    const newRule: RowFilter = { column: columns[0] || "", operator: "eq", value: "" };
    onChange({ ...group, rules: [...group.rules, newRule] });
  };

  const addGroup = () => {
    const newGroup: FilterGroup = { operator: "and", rules: [] };
    onChange({ ...group, rules: [...group.rules, newGroup] });
  };

  const updateRule = (index: number, rule: RowFilter | FilterGroup) => {
    const next = [...group.rules];
    next[index] = rule;
    onChange({ ...group, rules: next });
  };

  const removeRule = (index: number) => {
    const next = group.rules.filter((_, i) => i !== index);
    onChange({ ...group, rules: next });
  };

  return (
    <div className={`space-y-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800 ${isRoot ? 'bg-zinc-50/50 dark:bg-zinc-900/50' : 'bg-white dark:bg-zinc-950'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <select
          className="rounded border border-zinc-200 bg-transparent px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:border-zinc-800"
          value={group.operator}
          onChange={(e) => onChange({ ...group, operator: e.target.value as "and" | "or" })}
        >
          <option value="and">Y (AND)</option>
          <option value="or">O (OR)</option>
        </select>
        {!isRoot && (
          <button onClick={onRemove} className="text-zinc-400 hover:text-red-500 text-[10px]">Quitar Grupo</button>
        )}
      </div>

      <div className="space-y-2 pl-2 border-l-2 border-zinc-100 dark:border-zinc-800">
        {group.rules.map((rule, i) => (
          "rules" in rule ? (
            <FilterGroupEditor
              key={i}
              group={rule as FilterGroup}
              columns={columns}
              onChange={(g) => updateRule(i, g)}
              onRemove={() => removeRule(i)}
            />
          ) : (
            <FilterRuleRow
              key={i}
              rule={rule as RowFilter}
              columns={columns}
              onChange={(r) => updateRule(i, r)}
              onRemove={() => removeRule(i)}
            />
          )
        ))}
      </div>

      <div className="mt-2 flex gap-2">
        <button onClick={addRule} className="text-[10px] font-medium text-blue-600 hover:underline">+ Añadir regla</button>
        <button onClick={addGroup} className="text-[10px] font-medium text-zinc-500 hover:underline">+ Añadir grupo</button>
      </div>
    </div>
  );
}

function FilterRuleRow({ rule, columns, onChange, onRemove }: { rule: RowFilter; columns: string[]; onChange: (r: RowFilter) => void; onRemove: () => void; }) {
  const operators: { value: FilterOperator; label: string }[] = [
    { value: "eq", label: "es" },
    { value: "neq", label: "no es" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "contains", label: "contiene" },
    { value: "not.contains", label: "no contiene" },
    { value: "is_empty", label: "vacío" },
    { value: "is_not_empty", label: "no vacío" },
  ];

  return (
    <div className="flex items-center gap-2 py-1">
      <select className="w-1/3 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900" value={rule.column} onChange={(e) => onChange({ ...rule, column: e.target.value })}>
        {columns.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
      <select className="w-20 rounded border border-zinc-200 bg-white px-1 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900" value={rule.operator} onChange={(e) => onChange({ ...rule, operator: e.target.value as FilterOperator })}>
        {operators.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {rule.operator !== "is_empty" && rule.operator !== "is_not_empty" && (
        <div className="flex-1 flex items-center gap-1">
          <input className="w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[11px] dark:border-zinc-800 dark:bg-zinc-900" value={String(rule.value ?? "")} onChange={(e) => onChange({ ...rule, value: e.target.value })} />
          <DateVariablePicker onSelect={(v) => onChange({ ...rule, value: v })} />
        </div>
      )}
      <button onClick={onRemove} className="text-zinc-400 hover:text-red-500">✕</button>
    </div>
  );
}

function DateVariablePicker({ onSelect }: { onSelect: (v: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const vars = [
    { label: "Hoy", value: "{hoy}" },
    { label: "Ayer", value: "{ayer}" },
    { label: "Hace 7 días", value: "{hace_7_dias}" },
    { label: "Hace 30 días", value: "{hace_30_dias}" },
    { label: "Inicio mes", value: "{inicio_mes}" },
    { label: "Inicio año", value: "{inicio_año}" },
  ];
  return (
    <div className="relative">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`rounded p-1 text-[10px] transition-colors ${isOpen ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' : 'bg-zinc-100 dark:bg-zinc-800'}`}
      >
        📅
      </button>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-30 mt-1 flex w-32 flex-col rounded-md border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
            {vars.map(v => (
              <button 
                key={v.value} 
                onClick={() => {
                  onSelect(v.value);
                  setIsOpen(false);
                }} 
                className="px-2 py-1.5 text-left text-[10px] hover:bg-zinc-50 dark:hover:bg-zinc-800"
              >
                {v.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function JSSnippets({ columns, onInsert }: { columns: string[]; onInsert: (s: string) => void }) {
  const common = [
    { label: "row", value: "row['" },
    { label: "data", value: "data" },
    { label: "sum()", value: "utils.sum('" },
    { label: "avg()", value: "utils.avg('" },
    { label: "count()", value: "utils.count()" },
    { label: "max()", value: "utils.max('" },
    { label: "min()", value: "utils.min('" },
  ];

  return (
    <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap gap-1">
        {common.map((c) => (
          <button
            key={c.label}
            onClick={() => onInsert(c.value)}
            className="rounded bg-zinc-100 px-1.5 py-0.5 text-[9px] font-medium hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700"
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="flex max-h-20 flex-wrap gap-1 overflow-y-auto rounded border border-zinc-100 p-1 dark:border-zinc-800">
        <span className="w-full text-[8px] uppercase tracking-widest text-zinc-400">Columnas</span>
        {columns.map((col) => (
          <button
            key={col}
            onClick={() => onInsert(`row['${col}']`)}
            className="rounded bg-zinc-100 px-1 py-0.5 text-[9px] text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            {col}
          </button>
        ))}
      </div>
    </div>
  );
}

function ColumnSettingsItem({
  id,
  name,
  isCustom,
  display,
  baseColumns,
  onPatch,
  onDeleteCustom,
}: {
  id: string;
  name: string;
  isCustom?: boolean;
  display: DisplayConfig;
  baseColumns: string[];
  onPatch: (p: Partial<DisplayConfig>) => void;
  onDeleteCustom?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const isHidden = display.hiddenColumns?.includes(name);
  const format = display.columnFormats?.[name] || { style: "decimal" };
  const isTotal = display.totalColumns?.includes(name);
  const isSort = display.orderBy?.column === name;

  const toggleVisibility = (e: React.MouseEvent) => {
    e.stopPropagation();
    const current = display.hiddenColumns || [];
    const next = isHidden 
      ? current.filter(c => c !== name)
      : [...current, name];
    onPatch({ hiddenColumns: next });
  };

  const updateFormat = (patch: Partial<ColumnFormatConfig>) => {
    onPatch({ 
      columnFormats: { 
        ...display.columnFormats, 
        [name]: { ...format, ...patch } 
      } 
    });
  };

  const addRule = () => {
    const newRule: ColorRule = { column: name, operator: "gt", value: 100, colorBackground: "#dcfce7", colorText: "#166534" };
    onPatch({ colorRules: [...(display.colorRules || []), newRule] });
  };

  const updateRule = (ruleIndexInGlobal: number, patch: Partial<ColorRule>) => {
    const next = [...(display.colorRules || [])];
    next[ruleIndexInGlobal] = { ...next[ruleIndexInGlobal], ...patch };
    onPatch({ colorRules: next });
  };

  const removeRule = (ruleIndexInGlobal: number) => {
    onPatch({ colorRules: (display.colorRules || []).filter((_, i) => i !== ruleIndexInGlobal) });
  };

  const toggleTotal = () => {
    const current = display.totalColumns || [];
    const next = isTotal
      ? current.filter(c => c !== name)
      : [...current, name];
    onPatch({ totalColumns: next });
  };

  const toggleSort = () => {
    if (isSort) {
      onPatch({ orderBy: undefined });
    } else {
      onPatch({ orderBy: { column: name, ascending: display.orderBy?.ascending ?? true } });
    }
  };

  const columnRules = (display.colorRules || [])
    .map((r, i) => ({ ...r, globalIndex: i }))
    .filter(r => r.column === name);

  const customCol = display.customColumns.find(c => c.id === id);
  const isDuplicateName = isCustom && (baseColumns.includes(name) || display.customColumns.some(c => c.header === name && c.id !== customCol?.id));

  return (
    <div className="border-b border-zinc-100 last:border-0 dark:border-zinc-800/50">
      <div 
        className={`flex cursor-pointer items-center gap-2 px-3 py-2.5 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${isHidden ? 'bg-zinc-50/30' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <button 
          onClick={toggleVisibility} 
          className={`flex h-5 w-5 items-center justify-center rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 ${isHidden ? 'text-zinc-300' : 'text-zinc-600 dark:text-zinc-400'}`}
          title={isHidden ? "Mostrar" : "Ocultar"}
        >
          {isHidden ? "✕" : "✓"}
        </button>
        
        <div className="flex flex-1 min-w-0 flex-col">
          <span className={`truncate text-[11px] font-semibold ${isHidden ? 'text-zinc-400 line-through' : 'text-zinc-700 dark:text-zinc-200'}`}>
            {name}
          </span>
          {isDuplicateName && <span className="text-[8px] text-red-500 font-bold">⚠️ Nombre duplicado</span>}
        </div>

        {isCustom && <span className="rounded bg-blue-100 px-1 py-0.5 text-[8px] font-bold text-blue-600 dark:bg-blue-900/40">JS</span>}
        
        <div className="flex items-center gap-1.5 text-zinc-400">
           {isSort && <span className="text-[10px]" title="Ordenado">🔃</span>}
           {isTotal && <span className="text-[10px]" title="Total">∑</span>}
           <span className={`text-[10px] transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-4 bg-zinc-50/50 p-4 dark:bg-zinc-900/40 border-t border-zinc-100 dark:border-zinc-800" onClick={(e) => e.stopPropagation()}>
          {isCustom && customCol && (
             <div className="space-y-2">
               <div className="flex items-center justify-between">
                 <span className="text-[9px] font-bold uppercase text-zinc-400">Configuración JS</span>
                 <button onClick={onDeleteCustom} className="text-[9px] text-red-500 hover:underline">Eliminar columna</button>
               </div>
               <input 
                  className={`w-full rounded border px-2 py-1 text-[11px] dark:bg-zinc-950 ${isDuplicateName ? 'border-red-500' : 'border-zinc-200 dark:border-zinc-800'}`}
                  value={customCol.header}
                  placeholder="Nombre de la columna"
                  onChange={(e) => {
                    const current = display.customColumns || [];
                    const next = current.map(c => c.id === customCol.id ? { ...c, header: e.target.value } : c);
                    onPatch({ customColumns: next });
                  }}
               />
               <textarea 
                  className="w-full rounded border border-zinc-200 bg-white p-2 font-mono text-[10px] dark:border-zinc-800 dark:bg-zinc-950"
                  rows={3}
                  value={customCol.expression}
                  onChange={(e) => {
                    const current = display.customColumns || [];
                    const next = current.map(c => c.id === customCol.id ? { ...c, expression: e.target.value } : c);
                    onPatch({ customColumns: next });
                  }}
               />
               <JSSnippets 
                 columns={baseColumns} 
                 onInsert={(s) => {
                    const current = display.customColumns || [];
                    const next = current.map(c => c.id === customCol.id ? { ...c, expression: (c.expression || "") + s } : c);
                    onPatch({ customColumns: next });
                 }} 
               />
             </div>
          )}

          <div className="grid grid-cols-2 gap-4">
             <label className="block">
               <span className="text-[9px] font-bold uppercase text-zinc-400">Formato Numérico</span>
               <select 
                 className="mt-1.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] dark:border-zinc-800 dark:bg-zinc-950"
                 value={format.style}
                 onChange={(e) => updateFormat({ style: e.target.value as any })}
               >
                 <option value="decimal">Decimal</option>
                 <option value="integer">Entero</option>
                 <option value="currency">Moneda</option>
                 <option value="percent">Porcentaje</option>
               </select>
             </label>
             {format.style === "currency" && (
               <label className="block">
                 <span className="text-[9px] font-bold uppercase text-zinc-400">Símbolo</span>
                 <input 
                   className="mt-1.5 w-full rounded border border-zinc-200 bg-white px-2 py-1 text-[10px] dark:border-zinc-800 dark:bg-zinc-950"
                   value={format.currencyCode || "USD"}
                   onChange={(e) => updateFormat({ currencyCode: e.target.value })}
                 />
               </label>
             )}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" checked={isSort} onChange={toggleSort} className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700" />
                <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">Ordenar por esta columna</span>
              </label>
              {isSort && (
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPatch({ orderBy: { ...display.orderBy!, ascending: !display.orderBy?.ascending } });
                  }}
                  className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-extrabold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400 transition-colors"
                >
                  {display.orderBy?.ascending ? "↑ ASC" : "↓ DESC"}
                </button>
              )}
            </div>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" checked={isTotal} onChange={toggleTotal} className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-700" />
              <span className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">Incluir en fila de totales</span>
            </label>
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
             <div className="flex items-center justify-between">
               <span className="text-[9px] font-bold uppercase text-zinc-400">Colores Condicionales</span>
               <button onClick={addRule} className="rounded bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">+ Añadir Regla</button>
             </div>
             <div className="space-y-2">
               {columnRules.length === 0 && <p className="text-[9px] italic text-zinc-400 text-center py-1">Sin reglas de color activas.</p>}
               {columnRules.map((rule) => (
                 <div key={rule.globalIndex} className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950 space-y-3 shadow-sm">
                   <div className="flex items-center gap-2">
                     <select 
                       className="w-24 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] dark:border-zinc-800 dark:bg-zinc-900"
                       value={rule.operator}
                       onChange={(e) => updateRule(rule.globalIndex, { operator: e.target.value as any })}
                     >
                       <option value="gt">Mayor que</option>
                       <option value="lt">Menor que</option>
                       <option value="eq">Igual a</option>
                       <option value="contains">Contiene</option>
                     </select>
                     <input 
                       className="flex-1 rounded border border-zinc-200 bg-zinc-50 px-2 py-1 text-[10px] dark:border-zinc-800 dark:bg-zinc-900"
                       value={String(rule.value)}
                       onChange={(e) => updateRule(rule.globalIndex, { value: e.target.value })}
                     />
                     <button onClick={() => removeRule(rule.globalIndex)} className="text-zinc-400 hover:text-red-500">✕</button>
                   </div>
                   <div className="flex gap-6 justify-center">
                     <label className="flex items-center gap-2 text-[10px]">
                       <span>Fondo:</span>
                       <input type="color" value={rule.colorBackground} onChange={(e) => updateRule(rule.globalIndex, { colorBackground: e.target.value })} className="h-5 w-5 rounded cursor-pointer" />
                     </label>
                     <label className="flex items-center gap-2 text-[10px]">
                       <span>Texto:</span>
                       <input type="color" value={rule.colorText} onChange={(e) => updateRule(rule.globalIndex, { colorText: e.target.value })} className="h-5 w-5 rounded cursor-pointer" />
                     </label>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ColumnsManager({
  suggestions,
  display,
  onPatch,
}: {
  suggestions: string[];
  display: DisplayConfig;
  onPatch: (p: Partial<DisplayConfig>) => void;
}) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const customCols = display.customColumns || [];
  const baseCols = suggestions.map(s => ({ id: s, name: s, isCustom: false }));
  const customColsList = customCols.map(c => ({ id: c.id, name: c.header, isCustom: true }));
  let allCols = [...baseCols, ...customColsList];

  // Apply saved order
  if (display.columnOrder && display.columnOrder.length > 0) {
    const order = display.columnOrder;
    allCols.sort((a, b) => {
      let idxA = order.indexOf(a.name);
      let idxB = order.indexOf(b.name);
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      return idxA - idxB;
    });
  }

  const handleDragStart = (id: string) => setDraggedId(id);
  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;
    const items = [...allCols];
    const srcIdx = items.findIndex(i => i.id === draggedId);
    const dstIdx = items.findIndex(i => i.id === targetId);
    if (srcIdx === -1 || dstIdx === -1) return;
    
    const [removed] = items.splice(srcIdx, 1);
    items.splice(dstIdx, 0, removed);
    
    onPatch({ columnOrder: items.map(i => i.name) });
    setDraggedId(null);
  };

  const addCustom = () => {
    const id = Math.random().toString(36).substring(7);
    const header = `Columna ${customCols.length + 1}`;
    onPatch({ customColumns: [...customCols, { id, header, expression: "row['id']" }] });
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Columnas y Formatos</h3>
        <button 
          onClick={addCustom}
          className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-bold text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          + Nueva Columna JS
        </button>
      </div>
      
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="border-b border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
          <div className="relative">
            <input 
              className="w-full rounded-md border border-zinc-200 bg-white pl-7 pr-2 py-1.5 text-[11px] outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950"
              placeholder="Filtrar columnas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-2 top-2 text-zinc-400">🔍</span>
          </div>
        </div>
        
        <div className="max-h-[500px] overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/50">
          {allCols.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase())).map(col => {
            const custom = customCols.find(cc => cc.id === col.id);
            return (
              <div 
                key={col.id}
                draggable
                onDragStart={() => handleDragStart(col.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(col.id)}
                className={draggedId === col.id ? "opacity-20" : ""}
              >
                <ColumnSettingsItem 
                  id={col.id}
                  name={col.name}
                  isCustom={col.isCustom}
                  display={display}
                  baseColumns={suggestions}
                  onPatch={onPatch}
                  onDeleteCustom={custom ? () => onPatch({ customColumns: customCols.filter(c => c.id !== custom.id) }) : undefined}
                />
              </div>
            );
          })}
        </div>
      </div>
      <p className="px-1 text-[9px] text-zinc-400 leading-relaxed">
        Personaliza cada columna individualmente. Los cambios de formato y color se aplican en tiempo real.
      </p>
    </section>
  );
}

export function WidgetInspector({ widget, onClose }: { widget: DashboardWidget; onClose: () => void; }) {
  const connections = useDashboardStore((s) => s.connections);
  const updateWidget = useDashboardStore((s) => s.updateWidget);
  const conn = connections.find((c) => c.id === widget.connectionId);
  const [rpcPreviewRows, setRpcPreviewRows] = useState<Record<string, unknown>[] | null>(null);

  const { suggestions, tableColsLoading } = useColumnSuggestions(
    widget,
    conn,
    rpcPreviewRows
  );

  const patch = (p: WidgetPatch) => updateWidget(widget.id, p);
  const display = mergeDisplay(widget.display);

  const allSuggestions = useMemo(() => {
    const base = [...suggestions];
    const customHeaders = (display.customColumns || []).map(c => c.header).filter(Boolean);
    return Array.from(new Set([...base, ...customHeaders]));
  }, [suggestions, display.customColumns]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <div className="max-h-[95vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-zinc-100 bg-white/80 px-6 py-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
          <div className="flex items-baseline gap-3">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Editor de Bloque</h2>
            <span className="text-xs text-zinc-400 font-medium">Configure datos y visualización</span>
          </div>
          <button onClick={onClose} className="rounded-full bg-zinc-900 px-6 py-2 text-xs font-bold text-white hover:bg-zinc-800 transition-all shadow-lg active:scale-95">Guardar y Cerrar</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 px-6 py-6">
          {/* Columna Izquierda: Datos y Columnas (60%) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Nombre del bloque</span>
                <input className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:border-zinc-800 dark:bg-zinc-900" value={widget.title} onChange={(e) => patch({ title: e.target.value })} />
              </label>
              <label className="block">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Conexión Supabase</span>
                <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none dark:border-zinc-800 dark:bg-zinc-900" value={widget.connectionId} onChange={(e) => patch({ connectionId: e.target.value })}>
                  {connections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            </div>

            <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">Origen de Datos</p>
              <div className="flex gap-2 mb-4 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                <button 
                  onClick={() => patch({ source: { ...widget.source, kind: "table" } as any })} 
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${widget.source.kind === 'table' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500'}`}
                >
                  Tabla
                </button>
                <button 
                  onClick={() => patch({ source: { ...widget.source, kind: "rpc" } as any })} 
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${widget.source.kind === 'rpc' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500'}`}
                >
                  RPC
                </button>
              </div>
              {widget.source.kind === "table" ? (
                <div className="grid grid-cols-2 gap-3">
                  <input className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:border-zinc-800 dark:bg-zinc-900" placeholder="Esquema (public)" value={widget.source.schema || ""} onChange={(e) => patch({ source: { ...widget.source, schema: e.target.value || undefined } as any })} />
                  <input className="rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:border-zinc-800 dark:bg-zinc-900" placeholder="Tabla" value={widget.source.table} onChange={(e) => patch({ source: { ...widget.source, table: e.target.value } as any })} />
                </div>
              ) : (
                <input className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none dark:border-zinc-800 dark:bg-zinc-900" placeholder="Nombre de la función RPC" value={widget.source.functionName} onChange={(e) => patch({ source: { ...widget.source, functionName: e.target.value } as any })} />
              )}
            </section>

            <section className="space-y-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Filtros de Datos (Lado Servidor)</span>
              <FilterGroupEditor isRoot group={widget.source.advancedFilters || { operator: "and", rules: [] }} columns={suggestions} onChange={(g) => patch({ source: { ...widget.source, advancedFilters: g } as any })} />
            </section>
            
            <ColumnsManager 
              suggestions={suggestions} 
              display={display} 
              onPatch={(p) => patch({ display: p })} 
            />
          </div>

          {/* Columna Derecha: Visualización y Diseño (40%) */}
          <div className="lg:col-span-5 space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Configuración de Visualización</p>
              <div className="space-y-5">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Tipo de Visualización</span>
                  <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm dark:border-zinc-800 dark:bg-zinc-900" value={display.visualization} onChange={(e) => patch({ display: { visualization: e.target.value as VisualizationKind } })}>
                    <option value="kpi">Métrica Grande (KPI)</option>
                    <option value="table">Tabla de Datos</option>
                    <option value="bar">Gráfico de Barras</option>
                    <option value="line">Gráfico de Líneas</option>
                    <option value="pie">Gráfico de Tarta</option>
                    <option value="cards">Tarjetas Informativas</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Valor / Eje Y</span>
                    <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" value={display.valueField || ""} onChange={(e) => patch({ display: { valueField: e.target.value } })}>
                      <option value="">(Ninguno)</option>{allSuggestions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Agregación</span>
                    <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" value={display.aggregate} onChange={(e) => patch({ display: { aggregate: e.target.value as AggregateMode } })}>
                      <option value="sum">Suma</option><option value="avg">Promedio</option><option value="count_rows">Contar filas</option><option value="min">Mínimo</option><option value="max">Máximo</option><option value="first">Primer valor</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Categoría / Agrupación (Eje X)</span>
                  <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" value={display.categoryField || ""} onChange={(e) => patch({ display: { categoryField: e.target.value, groupByField: e.target.value } })}>
                    <option value="">(Ninguno)</option>{allSuggestions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Agrupación Temporal</p>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Columna Fecha</span>
                  <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" value={display.dateField || ""} onChange={(e) => patch({ display: { dateField: e.target.value } })}>
                    <option value="">(Ninguna)</option>{suggestions.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Frecuencia</span>
                  <select className="mt-1.5 w-full rounded-lg border border-zinc-200 bg-white px-2 py-2 text-xs dark:border-zinc-800 dark:bg-zinc-900" value={display.groupTimeBy} onChange={(e) => patch({ display: { groupTimeBy: e.target.value as TimeGroupDimension } })}>
                    <option value="none">Sin agrupar</option><option value="day">Día</option><option value="week">Semana</option><option value="month">Mes</option><option value="year">Año</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Diseño Móvil</p>
              <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-900 rounded-lg">
                <button 
                  onClick={() => patch({ layout: { ...widget.layout, mobileWidth: 'half' } })}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${widget.layout.mobileWidth !== 'full' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500'}`}
                >
                  Mitad (1/2)
                </button>
                <button 
                  onClick={() => patch({ layout: { ...widget.layout, mobileWidth: 'full' } })}
                  className={`flex-1 rounded-md py-1.5 text-xs font-bold transition-all ${widget.layout.mobileWidth === 'full' ? 'bg-white shadow text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500'}`}
                >
                  Completo
                </button>
              </div>
              <p className="mt-2 text-[9px] text-zinc-400">En móvil, 'Mitad' forzará un formato cuadrado.</p>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Vistas Guardadas (Filtros)</p>
                <button 
                  onClick={() => {
                    const name = prompt("Nombre de la vista:");
                    if (name) useDashboardStore.getState().saveWidgetView(widget.id, name);
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:underline"
                >
                  + Guardar Actual
                </button>
              </div>
              <div className="space-y-2">
                {(!widget.views || widget.views.length === 0) && (
                  <p className="text-[10px] italic text-zinc-400 text-center py-2">No hay vistas guardadas.</p>
                )}
                {widget.views?.map(v => (
                  <div key={v.id} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900/30">
                    <span className="text-xs font-medium">{v.name}</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => useDashboardStore.getState().applyWidgetView(widget.id, v.id)}
                        className={`text-[10px] font-bold ${widget.activeViewId === v.id ? 'text-green-600' : 'text-zinc-400 hover:text-blue-600'}`}
                      >
                        {widget.activeViewId === v.id ? 'Activa' : 'Aplicar'}
                      </button>
                      <button 
                        onClick={() => useDashboardStore.getState().deleteWidgetView(widget.id, v.id)}
                        className="text-[10px] text-red-400 hover:text-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-4">Opciones de Bloque</p>
              <div className="mt-5 space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative inline-flex items-center">
                    <input type="checkbox" className="sr-only peer" checked={display.enableSearch} onChange={(e) => patch({ display: { enableSearch: e.target.checked } })} />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">Activar buscador interno</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                   <div className="relative inline-flex items-center">
                    <input type="checkbox" className="sr-only peer" checked={display.showTotalRow} onChange={(e) => patch({ display: { showTotalRow: e.target.checked } })} />
                    <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-none rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-200">Mostrar fila de totales</span>
                </label>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
