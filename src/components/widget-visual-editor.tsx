"use client";

import React, { useState } from "react";
import { 
  type DashboardWidget, 
  type WidgetComponent, 
  type ComponentType, 
  type ComponentAnchor,
  type SupabaseConnection
} from "@/lib/types";
import { useDashboardStore } from "@/stores/dashboard-store";
import { WidgetView } from "./widget-view";

const ANCHORS: { value: ComponentAnchor; label: string }[] = [
  { value: "top-left", label: "Arriba Izquierda" },
  { value: "top-center", label: "Arriba Centro" },
  { value: "top-right", label: "Arriba Derecha" },
  { value: "center-left", label: "Centro Izquierda" },
  { value: "center", label: "Centro Total" },
  { value: "center-right", label: "Centro Derecha" },
  { value: "bottom-left", label: "Abajo Izquierda" },
  { value: "bottom-center", label: "Abajo Centro" },
  { value: "bottom-right", label: "Abajo Derecha" },
];

export function WidgetVisualEditor({ widget, suggestions, connection }: { widget: DashboardWidget; suggestions: string[]; connection?: SupabaseConnection }) {
  const updateWidget = useDashboardStore(s => s.updateWidget);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [propertyTab, setPropertyTab] = useState<'style' | 'position'>('style');
  const [zoom, setZoom] = useState<'fit' | number>('fit');

  const components = widget.visualComponents || [];
  const selected = components.find(c => c.id === selectedId);

  const patchWidget = (p: any) => updateWidget(widget.id, p);

  const updateComponent = (id: string, patch: Partial<WidgetComponent>) => {
    const next = components.map(c => c.id === id ? { ...c, ...patch } : c);
    patchWidget({ visualComponents: next });
  };

  const addComponent = (type: ComponentType) => {
    const id = Math.random().toString(36).substring(7);
    const newComp: WidgetComponent = {
      id,
      name: `Nuevo ${type}`,
      type,
      visible: true,
      content: type === 'text' ? 'Nuevo Texto' : undefined,
      position: { anchor: 'center', x: 0, y: 0 },
      fontSize: 14,
      color: widget.display.colorText || '#000000',
    };
    patchWidget({ 
      visualMode: 'advanced',
      visualComponents: [...components, newComp] 
    });
    setSelectedId(id);
  };

  const removeComponent = (id: string) => {
    patchWidget({ visualComponents: components.filter(c => c.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };

  const toggleAdvanced = () => {
    const mode = widget.visualMode === 'advanced' ? 'classic' : 'advanced';
    
    // Auto-migrate classic layout to advanced layers if empty
    if (mode === 'advanced' && (!widget.visualComponents || widget.visualComponents.length === 0)) {
      const comps: WidgetComponent[] = [];
      const vis = widget.display.visualization;
      
      if (['bar', 'line', 'pie'].includes(vis)) {
        comps.push({
          id: Math.random().toString(36).substring(7),
          name: 'Gráfica Principal',
          type: 'chart',
          visible: true,
          position: { anchor: 'center', x: 0, y: 15, width: '100%', height: '80%' },
          color: widget.display.colorAccent || '#3b82f6'
        });
        if (!widget.display.hideHeader) {
          comps.push({
            id: Math.random().toString(36).substring(7),
            name: 'Título',
            type: 'text',
            content: widget.title,
            visible: true,
            position: { anchor: 'top-left', x: 20, y: 20 },
            fontSize: 16,
            fontWeight: 'bold',
            color: widget.display.colorText || '#ffffff'
          });
        }
      } else if (vis === 'kpi') {
        comps.push({
          id: Math.random().toString(36).substring(7),
          name: 'Valor Principal',
          type: 'value',
          content: widget.display.valueField || '',
          visible: true,
          position: { anchor: 'center', x: 0, y: 0 },
          fontSize: 64,
          fontWeight: 'bold',
          color: widget.display.colorText || '#ffffff'
        });
      }
      patchWidget({ visualMode: mode, visualComponents: comps });
    } else {
      patchWidget({ visualMode: mode });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-[600px]">
      {/* Columna Izquierda: Capas y Controles */}
      <div className="lg:col-span-4 space-y-6 flex flex-col h-full">
        <section className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Modo Avanzado</span>
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
              {widget.visualMode === 'advanced' ? 'Activado' : 'Desactivado (Clásico)'}
            </span>
          </div>
          <button 
            onClick={toggleAdvanced}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${widget.visualMode === 'advanced' ? 'bg-blue-600' : 'bg-zinc-300 dark:bg-zinc-700'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${widget.visualMode === 'advanced' ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </section>

        {widget.visualMode === 'advanced' && (
          <>
            <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Objetos (Capas)</h3>
                <div className="flex gap-1">
                  <button onClick={() => addComponent('text')} className="p-1 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded" title="Añadir Texto">T</button>
                  <button onClick={() => addComponent('value')} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded" title="Añadir Valor">#</button>
                  <button onClick={() => addComponent('chart')} className="p-1 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded" title="Añadir Gráfica">📊</button>
                  <button onClick={() => addComponent('icon')} className="p-1 text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded" title="Añadir Icono">★</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                {components.length === 0 && (
                  <div className="text-center py-8 px-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
                    <p className="text-[11px] text-zinc-400">No hay objetos personalizados aún.</p>
                  </div>
                )}
                {components.map((c, idx) => (
                  <div 
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedId === c.id ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm' : 'border-zinc-100 dark:border-zinc-800 hover:border-zinc-200 dark:hover:border-zinc-700 bg-white dark:bg-zinc-950'}`}
                  >
                    <div className="text-xs text-zinc-400 font-mono w-4">{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100 truncate">{c.name}</div>
                      <div className="text-[9px] uppercase text-zinc-400 font-semibold">{c.type} • {c.position.anchor}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); updateComponent(c.id, { visible: !c.visible }); }}
                      className={`text-xs ${c.visible ? 'text-zinc-400' : 'text-zinc-200'}`}
                    >
                      {c.visible ? '👁️' : '🕶️'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeComponent(c.id); }}
                      className="text-xs text-zinc-300 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Columna Central: Vista Previa Real */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 px-2 text-center">Vista Previa Real</h3>
        <div className="flex-1 flex items-center justify-center bg-zinc-200/50 dark:bg-zinc-900/50 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-800 p-4 overflow-auto relative min-h-[400px]">
          <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-lg p-1 shadow-sm border border-zinc-200 dark:border-zinc-800 z-50">
            <button onClick={() => setZoom(z => z === 'fit' ? 0.8 : Math.max(0.2, z - 0.2))} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400" title="Alejar">🔍-</button>
            <button onClick={() => setZoom('fit')} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-[10px] font-bold px-2 text-zinc-600 dark:text-zinc-400" title="Mostrar completo">AUTO</button>
            <button onClick={() => setZoom(z => z === 'fit' ? 1.2 : Math.min(3, z + 0.2))} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-400" title="Acercar">🔍+</button>
          </div>
          {(() => {
            const wWidth = (widget.layout.colSpan || 6) * 96; // Approx 96px per column (1152px total width / 12)
            const wHeight = (widget.layout.rowSpan || 4) * 84 - 24; // 60px row + 24px gap
            const fitScale = Math.min(1, 600 / wWidth); // Allow larger scale, scroll if needed
            const scale = zoom === 'fit' ? fitScale : zoom;
            
            return (
              <div style={{ width: wWidth * scale, height: wHeight * scale }} className="flex-shrink-0 relative">
                <div 
                  className="absolute top-0 left-0 shadow-2xl rounded-2xl overflow-hidden flex flex-col bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 md:p-5"
                  style={{ 
                    width: wWidth,
                    height: wHeight,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                    backgroundColor: widget.display.colorBackground,
                    color: widget.display.colorText
                  }}
                >
            {!widget.display.hideHeader && (
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 
                      className="text-sm font-bold tracking-tight whitespace-normal leading-tight"
                      style={{ color: widget.display.colorText || 'inherit' }}
                    >
                      {widget.title}
                    </h2>
                  </div>
                  {connection && (
                    <p 
                      className="mt-0.5 truncate text-[10px] font-medium uppercase tracking-wider opacity-60"
                      style={{ color: widget.display.colorText || 'inherit' }}
                    >
                      {connection.name}
                    </p>
                  )}
                </div>
              </div>
            )}
            <div className="flex-1 min-h-0 relative flex flex-col rounded-lg overflow-hidden">
              <WidgetView widget={widget} connection={connection} isPreview />
            </div>
          </div>
              </div>
            );
          })()}
        </div>
        <p className="text-[9px] text-zinc-400 text-center">Así es como se verá el bloque en tu tablero.</p>
      </div>

      {/* Columna Derecha: Propiedades del Objeto Seleccionado */}
      <div className="lg:col-span-3">
        {selected ? (
          <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden h-full flex flex-col">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
              <input 
                className="w-full bg-transparent text-sm font-bold text-zinc-900 dark:text-zinc-100 outline-none border-none p-0"
                value={selected.name}
                onChange={(e) => updateComponent(selected.id, { name: e.target.value })}
                placeholder="Nombre del objeto"
              />
              <div className="text-[9px] uppercase font-bold text-blue-500 mt-1">Configuración del Objeto</div>
            </div>

            <div className="flex border-b border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setPropertyTab('style')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${propertyTab === 'style' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-50/20' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                🎨 Estilo
              </button>
              <button 
                onClick={() => setPropertyTab('position')}
                className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-all ${propertyTab === 'position' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-50/20' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                📍 Posición
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-6">
              {propertyTab === 'style' ? (
                <>
                  <section className="space-y-3">
                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Contenido / Datos</span>
                      {selected.type === 'text' ? (
                        <textarea 
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-xs outline-none focus:ring-2 focus:ring-blue-500 dark:border-zinc-800 dark:bg-zinc-950"
                          rows={3}
                          value={selected.content}
                          onChange={(e) => updateComponent(selected.id, { content: e.target.value })}
                        />
                      ) : selected.type === 'value' ? (
                        <select 
                          className="mt-2 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={selected.content}
                          onChange={(e) => updateComponent(selected.id, { content: e.target.value })}
                        >
                          <option value="">Seleccionar campo...</option>
                          {suggestions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <div className="text-[10px] text-zinc-400 italic mt-1">Este tipo de objeto no requiere contenido manual.</div>
                      )}
                    </label>
                  </section>

                  <section className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Color</span>
                        <div className="mt-2 flex items-center gap-2">
                          <input 
                            type="color" 
                            className="h-8 w-8 shrink-0 rounded-lg cursor-pointer border-none"
                            value={selected.color}
                            onChange={(e) => updateComponent(selected.id, { color: e.target.value })}
                          />
                          <input 
                            type="text"
                            className="flex-1 min-w-0 rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-[10px] uppercase font-mono dark:border-zinc-800 dark:bg-zinc-950"
                            value={selected.color}
                            onChange={(e) => updateComponent(selected.id, { color: e.target.value })}
                          />
                        </div>
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Tamaño (px)</span>
                        <input 
                          type="number"
                          className="mt-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={selected.fontSize || ""}
                          onChange={(e) => updateComponent(selected.id, { fontSize: parseInt(e.target.value) || 0 })}
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Grosor Texto</span>
                      <select 
                        className="mt-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                        value={selected.fontWeight || 'normal'}
                        onChange={(e) => updateComponent(selected.id, { fontWeight: e.target.value })}
                      >
                        <option value="normal">Normal</option>
                        <option value="medium">Medium</option>
                        <option value="bold">Bold</option>
                        <option value="black">Extra Bold</option>
                      </select>
                    </label>
                  </section>
                </>
              ) : (
                <>
                  <section className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Ancho</span>
                        <input 
                          type="text"
                          className="mt-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={selected.position.width || ""}
                          placeholder="auto o 100%"
                          onChange={(e) => updateComponent(selected.id, { position: { ...selected.position, width: e.target.value } })}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Alto</span>
                        <input 
                          type="text"
                          className="mt-2 w-full rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                          value={selected.position.height || ""}
                          placeholder="auto o 100%"
                          onChange={(e) => updateComponent(selected.id, { position: { ...selected.position, height: e.target.value } })}
                        />
                      </label>
                    </div>

                    <label className="block">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Anclar a...</span>
                      <div className="mt-3 grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
                        {ANCHORS.map(a => (
                          <button
                            key={a.value}
                            onClick={() => updateComponent(selected.id, { position: { ...selected.position, anchor: a.value } })}
                            className={`h-8 rounded-lg text-[8px] font-bold uppercase transition-all ${selected.position.anchor === a.value ? 'bg-white text-blue-600 shadow-sm dark:bg-zinc-700 dark:text-blue-400' : 'text-zinc-400 hover:text-zinc-600'}`}
                          >
                            {a.value.split('-').map(s => s[0]).join('')}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-[9px] text-zinc-400 italic text-center">{ANCHORS.find(a => a.value === selected.position.anchor)?.label}</p>
                    </label>

                    <div className="space-y-4 pt-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Desplazamiento X</span>
                          <span className="text-[10px] font-mono text-zinc-500">{selected.position.x}px</span>
                        </div>
                        <input 
                          type="range" min="-200" max="200" step="1"
                          className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                          value={selected.position.x || 0}
                          onChange={(e) => updateComponent(selected.id, { position: { ...selected.position, x: parseInt(e.target.value) || 0 } })}
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Desplazamiento Y</span>
                          <span className="text-[10px] font-mono text-zinc-500">{selected.position.y}px</span>
                        </div>
                        <input 
                          type="range" min="-200" max="200" step="1"
                          className="w-full h-1 bg-zinc-200 rounded-lg appearance-none cursor-pointer dark:bg-zinc-700"
                          value={selected.position.y || 0}
                          onChange={(e) => updateComponent(selected.id, { position: { ...selected.position, y: parseInt(e.target.value) || 0 } })}
                        />
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-zinc-50 dark:bg-zinc-950 rounded-3xl border border-dashed border-zinc-200 dark:border-zinc-800">
            <div className="text-4xl mb-4">👈</div>
            <p className="text-sm font-bold text-zinc-400">Selecciona un objeto de la lista para editar sus propiedades.</p>
          </div>
        )}
      </div>
    </div>
  );
}
