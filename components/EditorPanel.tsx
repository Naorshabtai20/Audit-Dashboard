
import React, { useState, useEffect, useRef } from 'react';
import { Section, SectionType, Report, ReportTab, ChartSection, TableSection, KPISection, SectionStyles, SummaryEvaluationSection, DateSection, AnomalySection, AnomalyItem, TextSection, GraphicSection } from '../types';

interface EditorPanelProps
{
  // report here represents the active tab payload (sections + tab settings)
  report: any;
  onUpdate: (report: any) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onCloseSidebar: () => void;

  // Tab management (passed from App) - used to show/add/delete/switch tabs inside the editor
  tabs?: ReportTab[];
  activeTabIndex?: number;
  onAddTab?: () => void;
  onDeleteTab?: (index: number) => void;
  onSelectTab?: (index: number) => void;
  // reorder tabs by specifying from index and to index
  onMoveTab?: (from: number, to: number) => void;
  // Optional: control sidebar width externally (App). If provided, EditorPanel will call onSidebarWidthChange during resize.
  sidebarWidth?: number;
  onSidebarWidthChange?: (w: number) => void;
}

const SECTION_OPTIONS = [
  { type: 'text' as SectionType, label: 'טקסט מעוצב', icon: '📝' },
  { type: 'kpi' as SectionType, label: 'מדדי KPI', icon: '🎯' },
  { type: 'summary_evaluation' as SectionType, label: 'הערכה מסכמת', icon: '⚖️' },
  { type: 'anomaly' as SectionType, label: 'רשימת ממצאים', icon: '🔍' },
  { type: 'date' as SectionType, label: 'תאריכון', icon: '📅' },
  { type: 'chart' as SectionType, label: 'גרף נתונים', icon: '📊' },
  { type: 'table' as SectionType, label: 'טבלת נתונים', icon: '📋' },
  { type: 'graphic' as SectionType, label: 'תמונה / גרפיקה', icon: '🖼️' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ report, onUpdate, selectedId, onSelect, onMove, onCloseSidebar, tabs = [], activeTabIndex = 0, onAddTab, onDeleteTab, onSelectTab, onMoveTab, sidebarWidth, onSidebarWidthChange }) =>
{
  const [tabsOpen, setTabsOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [sectionDragIndex, setSectionDragIndex] = useState<number | null>(null);
  // width for the editor panel (right sidebar). null means let parent handle sizing.
  const [width, setWidth] = useState<number | null>(sidebarWidth ?? 420);

  useEffect(() =>
  {
    const handleClick = (e: MouseEvent) =>
    {
      if (!tabsRef.current) return;
      if (!(e.target instanceof Node)) return;
      if (!tabsRef.current.contains(e.target)) setTabsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setTabsOpen(false); };
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('click', handleClick); document.removeEventListener('keydown', handleKey); };
  }, []);
  const [pasteBuffer, setPasteBuffer] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const sections = report?.sections || [];
  const selectedSection = sections.find((s: any) => s.id === selectedId);

  useEffect(() =>
  {
    if (!selectedSection)
    {
      setPasteBuffer('');
      return;
    }
    if (selectedSection.type === 'table')
    {
      const table = selectedSection as TableSection;
      setPasteBuffer([(table.headers || []).join('\t'), ...(table.rows || []).map(r => (r || []).join('\t'))].join('\n'));
    } else if (selectedSection.type === 'chart')
    {
      const chart = selectedSection as ChartSection;
      if (!chart.data || chart.data.length === 0) { setPasteBuffer(''); return; }
      const headers = [chart.xKey || 'x', ...(chart.seriesKeys || [])].join('\t');
      const rows = chart.data.map(row => [row[chart.xKey || 'x'], ...(chart.seriesKeys || []).map(k => row[k])].join('\t')).join('\n');
      setPasteBuffer(headers + '\n' + rows);
    }
  }, [selectedId]);

  const updateSection = (id: string, updates: Partial<Section>) =>
  {
    const newSections = sections.map((s: any) => s.id === id ? { ...s, ...updates } : s);
    onUpdate({ ...report, sections: newSections });
  };

  const updateStyles = (id: string, styleUpdates: Partial<SectionStyles>) =>
  {
    const section = sections.find((s: any) => s.id === id);
    if (!section) return;
    updateSection(id, { styles: { ...(section.styles || {}), ...styleUpdates } });
  };

  const processTextToData = (text: string, sectionId: string) =>
  {
    const section = sections.find((s: any) => s.id === sectionId);
    if (!text || !section) return;
    const lines = text.trim().split(/\r?\n/).map(l => l.split(/\t|,/).map(cell => cell.trim()));
    if (section.type === 'table')
    {
      updateSection(sectionId, { headers: lines[0] || [], rows: lines.slice(1) || [] } as any);
    } else if (section.type === 'chart')
    {
      const firstRow = lines[0];
      const dataRows = lines.slice(1);
      const xKey = firstRow[0] || 'x';
      const seriesKeys = firstRow.slice(1);
      const parsedData = dataRows.map(row =>
      {
        const obj: Record<string, any> = { [xKey]: row[0] || '' };
        seriesKeys.forEach((key, i) =>
        {
          const rawVal = (row[i + 1] || '0').replace(/[^\d.-]/g, '');
          const val = parseFloat(rawVal);
          obj[key] = isNaN(val) ? 0 : val;
        });
        return obj;
      });
      updateSection(sectionId, { data: parsedData, xKey, seriesKeys } as any);
    }
  };

  const supportsManualHeight = selectedSection?.type === 'chart' || selectedSection?.type === 'graphic';

  // EditorPanel no longer implements its own drag-to-resize logic.
  // Resizing is handled centrally by App to keep behavior consistent between editor and viewer.

  // sync when parent controls width
  useEffect(() =>
  {
    if (sidebarWidth !== undefined) setWidth(sidebarWidth);
  }, [sidebarWidth]);

  const appliedWidth = width ? `${width}px` : undefined;

  // splitter drag state (a dedicated handle will control resizing)
  const draggingRef = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef<number>(width ?? 420);

  const clampWidth = (w: number) => Math.max(200, Math.min(w, window.innerWidth - 200));

  useEffect(() =>
  {
    const onMove = (e: MouseEvent) =>
    {
      if (!draggingRef.current) return;
      const clientX = e.clientX;
      const delta = dragStartX.current - clientX; // panel on right: moving left (clientX down) increases width
      const newW = clampWidth(dragStartWidth.current + delta);
      setWidth(newW);
      onSidebarWidthChange?.(newW);
    };
    const onUp = () => { if (draggingRef.current) { draggingRef.current = false; document.body.style.userSelect = ''; } };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mouseleave', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); window.removeEventListener('mouseleave', onUp); };
  }, [onSidebarWidthChange]);

  return (
    <div style={{ width: appliedWidth }} className="relative flex-none flex flex-col h-full bg-white border-l border-slate-200 shadow-xl" dir="rtl">
      <div className="h-20 bg-[#002d72] text-white flex justify-between items-center shrink-0 relative">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">מעצב הדו"ח</h2>
        </div>
      </div>

      {/* Resize handle placed further outside the editor so it doesn't overlap the editor scrollbar */}
      <div className="absolute -left-12 top-0 bottom-0 w-12 z-50 pointer-events-none">
        <div
          className="absolute left-0 top-0 bottom-0 w-12 cursor-col-resize flex items-center justify-center pointer-events-auto"
          onMouseDown={(e) =>
          {
            e.stopPropagation();
            e.preventDefault();
            draggingRef.current = true;
            dragStartX.current = e.clientX;
            dragStartWidth.current = width ?? 420;
            // prevent text selection while dragging
            document.body.style.userSelect = 'none';
          }}
          onTouchStart={(e) =>
          {
            const t = e.touches && e.touches[0];
            if (!t) return;
            e.stopPropagation();
            // prevent page scroll while starting drag
            e.preventDefault();
            draggingRef.current = true;
            dragStartX.current = t.clientX;
            dragStartWidth.current = width ?? 420;
            document.body.style.userSelect = 'none';
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize editor panel"
          title="גרור לשינוי רוחב"
        >
          {/* visual bar so users can see the handle */}
          <div className="w-px h-full bg-slate-200 rounded-sm pointer-events-none"></div>
          {/* subtle grip marks */}
          <div className="absolute left-1/2 transform -translate-x-1/2 flex flex-col gap-1 pointer-events-none">
            <span className="block w-px h-6 bg-slate-400 opacity-60"></span>
            <span className="block w-px h-6 bg-slate-400 opacity-30"></span>
          </div>
        </div>
      </div>

      {/**
       * When a section (or tab-settings) is selected we want the editor to fill the
       * available panel space. When nothing is selected we show the sections list.
       */}
      {!(selectedSection || selectedId === 'tab-settings') ? (
        <div style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
          {/* Current tab + dropdown with full tab management */}
          <div className="space-y-3">
            <div ref={tabsRef} className="relative">
              <button onClick={() => setTabsOpen(s => !s)} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between text-right transition-all ${'bg-white border-transparent hover:border-slate-100 shadow-sm'}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-40">{(tabs[activeTabIndex] && tabs[activeTabIndex].icon) || '📄'}</span>
                  <div>
                    <p className="font-black text-sm leading-none mb-1 text-slate-700">{(tabs[activeTabIndex] && tabs[activeTabIndex].title) || 'טאב נוכחי'}</p>
                    <p className="text-[10px] text-slate-400">{(tabs[activeTabIndex] && (tabs[activeTabIndex].sections || []).length) || 0} פריטים</p>
                  </div>
                </div>
              </button>

              {tabsOpen && (
                <div className="absolute mt-2 right-0 left-0 z-50 bg-white border rounded-2xl shadow-lg p-3">
                  <div className="flex flex-col gap-2">
                    {tabs.map((t, idx) => (
                      <div
                        key={idx}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => { e.preventDefault(); }}
                        onDrop={() => { if (dragIndex !== null && dragIndex !== idx) { onMoveTab?.(dragIndex, idx); setDragIndex(null); } }}
                        onClick={() => { onSelect(null); onSelectTab?.(idx); setTabsOpen(false); }}
                        className={`group flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer ${dragIndex === idx ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          {/* Improved tab icon – circular badge with primary color (shown on hover) */}
                          <span className="flex items-center justify-center w-6 h-6 rounded-full text-white text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150">{(t.icon && t.icon.length <= 2) ? t.icon : (t.title || 'T').charAt(0)}</span>
                          <div className="text-right">
                            <div className="font-black text-sm">{t.title || `טאב ${idx + 1}`}</div>
                            <div className="text-[10px] text-slate-400">{(t.sections || []).length} פריטים</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity duration-150">
                          {/* Edit icon – use same gear icon as tab settings */}
                          <button onClick={(e) => { e.stopPropagation(); onSelectTab?.(idx); onSelect('tab-settings'); setTabsOpen(false); }} className="w-6 h-6 flex items-center justify-center bg-white border rounded text-xs">⚙️</button>
                          {/* Delete icon – small red trash icon (red color only) */}
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTab?.(idx); }} aria-label="מחק טאב" className="w-6 h-6 flex items-center justify-center bg-white text-rose-500 rounded text-xs hover:bg-slate-50 border border-slate-200">🗑️</button>
                        </div>
                      </div>
                    ))}

                    <div className="pt-2 border-t mt-2">
                      <button onClick={() =>
                      {
                        // Request parent to add a new tab, then select it and open its settings
                        onAddTab?.();
                        const newIndex = tabs.length; // assume new tab is appended
                        onSelectTab?.(newIndex);
                        onSelect('tab-settings');
                        setTabsOpen(false);
                      }} className="w-full p-3 rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 text-slate-600 font-black hover:bg-[#002d72] hover:text-white transition-all">+ הוסף טאב</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {sections.map((sec: any, idx: number) => (
            <div
              key={sec.id}
              className="relative group"
              draggable
              onDragStart={(e) => { setSectionDragIndex(idx); e.dataTransfer?.setData('text/plain', String(idx)); }}
              onDragOver={(e) => { e.preventDefault(); }}
              onDrop={(e) => { e.preventDefault(); if (sectionDragIndex !== null && sectionDragIndex !== idx) { const newSections = [...sections]; const [moved] = newSections.splice(sectionDragIndex, 1); newSections.splice(idx, 0, moved); onUpdate({ ...report, sections: newSections }); setSectionDragIndex(null); } }}
              onDragEnd={() => setSectionDragIndex(null)}
            >
              <button onClick={() => onSelect(sec.id)} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between text-right transition-all ${selectedId === sec.id ? 'border-[#002d72] bg-white shadow-lg' : 'bg-white border-transparent hover:border-slate-100 shadow-sm'} ${sectionDragIndex === idx ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-40">{SECTION_OPTIONS.find(o => o.type === sec.type)?.icon}</span>
                  <div><p className={`font-black text-sm leading-none mb-1 ${selectedId === sec.id ? 'text-[#002d72]' : 'text-slate-700'}`}>{sec.title || 'ללא כותרת'}</p><p className="text-[10px] text-slate-400">{sec.type.toUpperCase()}</p></div>
                </div>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onUpdate({ ...report, sections: sections.filter((s: any) => s.id !== sec.id) }); onSelect(null); }}
                aria-label="מחק אובייקט"
                className="absolute top-2 left-2 w-6 h-6 bg-white text-rose-500 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none group-hover:pointer-events-auto text-xs hover:bg-slate-50 border border-slate-200"
              >
                🗑️
              </button>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-200">
            {SECTION_OPTIONS.map(opt => (
              <button key={opt.type} onClick={() =>
              {
                const id = `sec-${Date.now()}`;
                const newSec = {
                  id, type: opt.type, title: opt.label,
                  styles: { colSpan: 12, height: (opt.type === 'chart' || opt.type === 'graphic') ? 400 : undefined, fontScale: 1, dataFontScale: 1, labelFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'summary_evaluation' ? { briefingText: 'הזן סיכום...', score: 5, scoreLabel: 'תקין', recommendations: ['המלצה 1'], deficiencies: ['ליקוי 1'] } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד חדש', value: '0' }] } : {}),
                  ...(opt.type === 'anomaly' ? { items: [{ id: `an-${Date.now()}`, title: 'ממצא חדש', department: 'גורם מבוקר חדש', status: 'בטיפול', riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-' + Math.floor(Math.random() * 100), protocolStatus: 'פתוח', link: '' }] } : {}),
                  ...(opt.type === 'chart' ? { chartKind: 'bar', data: [{ x: 'א', y: 10 }], xKey: 'x', seriesKeys: ['y'] } : {}),
                  ...(opt.type === 'table' ? { headers: ['עמודה 1'], rows: [['נתון 1']] } : {}),
                  ...(opt.type === 'text' ? { content: 'טקסט חדש...' } : {}),
                  ...(opt.type === 'date' ? { date: new Date().toISOString().split('T')[0], label: 'תאריך הדו"ח' } : {}),
                  ...(opt.type === 'graphic' ? { src: '' } : {})
                };
                onUpdate({ ...report, sections: [...sections, newSec] });
                onSelect(id);
              }} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-[#002d72] hover:text-white transition-all text-xs font-bold shadow-sm">
                <span className="text-2xl">{opt.icon}</span> {opt.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {(selectedSection || selectedId === 'tab-settings') && (
        <div style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }} className="flex-1 border-t bg-white overflow-y-auto shadow-2xl z-50 custom-scrollbar animate-in slide-in-from-bottom duration-300 text-right">
          {/* Header spans full width of the editor panel */}
          <div className="sticky top-0 bg-white z-[60] w-full border-b">
            <div className="flex justify-between items-center p-4">
              <h3 className="text-xl font-black text-[#002d72]">{selectedId === 'tab-settings' ? 'הגדרות טאב' : `עריכת ${SECTION_OPTIONS.find(o => o.type === selectedSection?.type)?.label}`}</h3>
              <button onClick={() => onSelect(null)} aria-label="Close editor" className="w-6 h-6 bg-rose-500 text-white rounded flex items-center justify-center font-bold hover:bg-rose-600 border border-slate-200">×</button>
            </div>
          </div>

          <div className="p-4 space-y-8 pb-24">
            {selectedId === 'tab-settings' ? (
              <div className="space-y-6">
                <div className="space-y-2"><label className="text-xs font-black text-slate-400">אייקון</label><input type="text" value={report.tabIcon || ''} onChange={e => onUpdate({ ...report, tabIcon: e.target.value })} className="w-full p-4 border rounded-2xl font-bold text-2xl text-center" /></div>
                <div className="space-y-2"><label className="text-xs font-black text-slate-400">שם הטאב</label><input type="text" value={report.tabTitle || ''} onChange={e => onUpdate({ ...report, tabTitle: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" /></div>
                <div className="space-y-2"><label className="text-xs font-black text-slate-400">תת כותרת</label><input type="text" value={report.tabSubTitles || ''} onChange={e => onUpdate({ ...report, tabSubTitles: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" /></div>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <label className="text-xs font-black text-slate-400">כותרת האובייקט</label>
                  <input type="text" value={selectedSection.title || ''} onChange={e => updateSection(selectedId!, { title: e.target.value })} className="w-full p-4 border rounded-2xl font-bold text-indigo-900 shadow-sm" />
                </div>

                <div className="space-y-8 bg-slate-50 p-6 rounded-[2rem] border-2 border-slate-100 shadow-inner">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">רוחב (1-12 עמודות)</label>
                      <span className="text-xs font-black text-indigo-700">{selectedSection.styles?.colSpan || 12}</span>
                    </div>
                    <input type="range" min="1" max="12" step="1" value={selectedSection.styles?.colSpan || 12} onChange={e => updateStyles(selectedId!, { colSpan: parseInt(e.target.value) })} className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-sm" />
                  </div>

                  {supportsManualHeight && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">גובה (פיקסלים)</label>
                        <span className="text-xs font-black text-indigo-700">{selectedSection.styles?.height || 400}px</span>
                      </div>
                      <input type="range" min="50" max="1500" step="10" value={selectedSection.styles?.height || 400} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 shadow-sm" />
                    </div>
                  )}

                  <div className="pt-6 border-t border-slate-200 space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase">קנה מידה כותרות</label>
                        <span className="text-[10px] font-bold text-slate-600">{selectedSection.styles?.fontScale || 1}x</span>
                      </div>
                      <input type="range" min="0.2" max="4" step="0.1" value={selectedSection.styles?.fontScale || 1} onChange={e => updateStyles(selectedId!, { fontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002d72]" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase">קנה מידה נתונים</label>
                        <span className="text-[10px] font-bold text-slate-600">{selectedSection.styles?.dataFontScale || 1}x</span>
                      </div>
                      <input type="range" min="0.2" max="4" step="0.1" value={selectedSection.styles?.dataFontScale || 1} onChange={e => updateStyles(selectedId!, { dataFontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002d72]" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-black text-slate-400 uppercase">קנה מידה תוויות</label>
                        <span className="text-[10px] font-bold text-slate-600">{selectedSection.styles?.labelFontScale || 1}x</span>
                      </div>
                      <input type="range" min="0.2" max="3" step="0.1" value={selectedSection.styles?.labelFontScale || 1} onChange={e => updateStyles(selectedId!, { labelFontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#002d72]" />
                    </div>
                  </div>
                </div>

                {selectedSection.type === 'anomaly' && (
                  <div className="space-y-6">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">ניהול ממצאים</label>
                    <button onClick={() =>
                    {
                      const items = [...(selectedSection as AnomalySection).items];
                      items.push({ id: `an-${Date.now()}`, title: 'ממצא חדש', department: 'גורם מבוקר חדש', status: 'בטיפול', riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-' + Math.floor(Math.random() * 100), protocolStatus: 'פתוח', link: '' });
                      updateSection(selectedId!, { items });
                    }} className="w-full py-4 bg-[#002d72] text-white rounded-2xl font-black text-xs shadow-lg">+ הוסף ממצא חדש לרשימה</button>

                    <div className="space-y-6">
                      {(selectedSection as AnomalySection).items.map((item, idx) => (
                        <div key={item.id} className="p-6 bg-slate-50 border-2 border-slate-200 rounded-[2rem] space-y-4 shadow-inner text-right">
                          <div className="flex justify-between items-center border-b pb-3 mb-3">
                            <span className="font-black text-[10px] text-slate-400">ממצא #{idx + 1}</span>
                            <button
                              onClick={() =>
                              {
                                const items = (selectedSection as AnomalySection).items.filter((_, i) => i !== idx);
                                updateSection(selectedId!, { items });
                              }}
                              aria-label={`מחק ממצא ${idx + 1}`}
                              className="w-6 h-6 bg-white text-rose-500 rounded flex items-center justify-center text-xs font-extrabold border border-slate-200"
                            >
                              🗑️
                            </button>
                          </div>
                          <input type="text" value={item.title} onChange={e =>
                          {
                            const items = [...(selectedSection as AnomalySection).items]; items[idx].title = e.target.value; updateSection(selectedId!, { items });
                          }} className="w-full p-3 border rounded-xl font-bold text-sm" placeholder="כותרת הממצא" />
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">גורם מבוקר</label>
                              <input type="text" value={item.department} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].department = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold" placeholder="גורם מבוקר" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">רמת סיכון (1-5)</label>
                              <input type="number" min="1" max="5" value={item.riskLevel} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].riskLevel = parseInt(e.target.value); updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold text-rose-600 text-center" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">דוח חריגה מפורט</label>
                            <textarea value={item.detailedReport} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].detailedReport = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-3 border rounded-xl text-[10px] h-24" placeholder="פירוט הממצא המלא..." />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase">ניתוח גורמי סיכון</label>
                            <textarea value={item.riskAnalysis} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].riskAnalysis = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-3 border rounded-xl text-[10px] h-24 bg-rose-50/30" placeholder="ניתוח סיכונים..." />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">סטטוס</label>
                              <input type="text" value={item.status} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].status = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold" placeholder="סטטוס" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">מזהה פנימי</label>
                              <input type="text" value={item.internalRef} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].internalRef = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold" placeholder="רפרנס" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">סטטוס פרוטוקול</label>
                              <input type="text" value={item.protocolStatus} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].protocolStatus = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold" placeholder="סטטוס פרוטוקול" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400">קישור חיצוני</label>
                              <input type="text" value={item.link || ''} onChange={e => { const items = [...(selectedSection as AnomalySection).items]; items[idx].link = e.target.value; updateSection(selectedId!, { items }); }} className="w-full p-2 border rounded-lg text-xs font-bold text-indigo-600" placeholder="URL מלא..." />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSection.type === 'kpi' && (
                  <div className="space-y-6">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">מדדי KPI</label>
                    {(selectedSection as KPISection).metrics.map((m, idx) => (
                      <div key={idx} className="p-4 bg-slate-50 border rounded-2xl space-y-3 relative text-right">
                        <button
                          onClick={() =>
                          {
                            const metrics = (selectedSection as KPISection).metrics.filter((_, i) => i !== idx);
                            updateSection(selectedId!, { metrics });
                          }}
                          aria-label="מחק מדד"
                          className="absolute top-2 left-2 w-6 h-6 bg-white text-rose-500 rounded flex items-center justify-center border border-slate-200 text-xs font-extrabold shadow-sm"
                        >
                          🗑️
                        </button>
                        <input type="text" value={m.label} onChange={e => { const metrics = [...(selectedSection as KPISection).metrics]; metrics[idx].label = e.target.value; updateSection(selectedId!, { metrics }); }} className="w-full p-2 border rounded-lg font-bold text-xs" placeholder="שם המדד" />
                        <div className="grid grid-cols-2 gap-2">
                          <input type="text" value={m.value} onChange={e => { const metrics = [...(selectedSection as KPISection).metrics]; metrics[idx].value = e.target.value; updateSection(selectedId!, { metrics }); }} className="p-2 border rounded-lg font-bold text-xs text-indigo-700" placeholder="ערך" />
                          <input type="text" value={m.delta || ''} onChange={e => { const metrics = [...(selectedSection as KPISection).metrics]; metrics[idx].delta = e.target.value; updateSection(selectedId!, { metrics }); }} className="p-2 border rounded-lg font-bold text-xs text-emerald-600" placeholder="שינוי" />
                        </div>
                      </div>
                    ))}
                    <button onClick={() => updateSection(selectedId!, { metrics: [...(selectedSection as KPISection).metrics, { label: 'מדד חדש', value: '0' }] })} className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-xl font-black text-[10px]">+ הוסף מדד KPI</button>
                  </div>
                )}

                {selectedSection.type === 'summary_evaluation' && (
                  <div className="space-y-8 text-right">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת הערכה מסכמת</label>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400">טקסט סיכום</label>
                      <textarea value={(selectedSection as SummaryEvaluationSection).briefingText} onChange={e => updateSection(selectedId!, { briefingText: e.target.value })} className="w-full p-4 border rounded-2xl font-black italic text-lg h-40 bg-slate-50 focus:bg-white shadow-inner" placeholder="הזן טקסט סיכום..." />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">ציון (1-5)</label><input type="number" min="1" max="5" value={(selectedSection as SummaryEvaluationSection).score} onChange={e => updateSection(selectedId!, { score: parseInt(e.target.value) })} className="w-full p-3 border rounded-xl font-bold text-rose-500 text-center" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-slate-400">סטטוס</label><input type="text" value={(selectedSection as SummaryEvaluationSection).scoreLabel} onChange={e => updateSection(selectedId!, { scoreLabel: e.target.value })} className="w-full p-3 border rounded-xl font-bold" /></div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-emerald-600 block border-b pb-2 uppercase tracking-widest">המלצות</label>
                      {(selectedSection as SummaryEvaluationSection).recommendations.map((rec, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" value={rec} onChange={e =>
                          {
                            const recs = [...(selectedSection as SummaryEvaluationSection).recommendations]; recs[idx] = e.target.value; updateSection(selectedId!, { recommendations: recs });
                          }} className="flex-1 p-2 border rounded-lg text-xs" />
                          <button
                            onClick={() =>
                            {
                              const recs = (selectedSection as SummaryEvaluationSection).recommendations.filter((_, i) => i !== idx); updateSection(selectedId!, { recommendations: recs });
                            }}
                            aria-label={`מחק המלצה ${idx + 1}`}
                            className="w-6 h-6 bg-white text-rose-500 rounded flex items-center justify-center text-xs font-extrabold border border-slate-200"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button onClick={() => updateSection(selectedId!, { recommendations: [...(selectedSection as SummaryEvaluationSection).recommendations, 'המלצה חדשה'] })} className="text-[10px] font-black text-emerald-600">+ הוסף המלצה</button>
                    </div>

                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-rose-600 block border-b pb-2 uppercase tracking-widest">ליקויים</label>
                      {(selectedSection as SummaryEvaluationSection).deficiencies.map((def, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input type="text" value={def} onChange={e =>
                          {
                            const defs = [...(selectedSection as SummaryEvaluationSection).deficiencies]; defs[idx] = e.target.value; updateSection(selectedId!, { deficiencies: defs });
                          }} className="flex-1 p-2 border rounded-lg text-xs" />
                          <button
                            onClick={() =>
                            {
                              const defs = (selectedSection as SummaryEvaluationSection).deficiencies.filter((_, i) => i !== idx); updateSection(selectedId!, { deficiencies: defs });
                            }}
                            aria-label={`מחק ליקוי ${idx + 1}`}
                            className="w-6 h-6 bg-white text-rose-500 rounded flex items-center justify-center text-xs font-extrabold border border-slate-200"
                          >
                            🗑️
                          </button>
                        </div>
                      ))}
                      <button onClick={() => updateSection(selectedId!, { deficiencies: [...(selectedSection as SummaryEvaluationSection).deficiencies, 'ליקוי חדש'] })} className="text-[10px] font-black text-rose-600">+ הוסף ליקוי</button>
                    </div>
                  </div>
                )}

                {(selectedSection.type === 'chart' || selectedSection.type === 'table') && (
                  <div className="space-y-6">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת נתונים</label>
                    {selectedSection.type === 'chart' && (
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {(['bar', 'line', 'pie', 'donut'] as const).map(k => (
                          <button key={k} onClick={() => updateSection(selectedId!, { chartKind: k })} className={`p-2 rounded-xl text-[10px] font-black border-2 transition-all ${selectedSection.chartKind === k ? 'bg-[#002d72] text-white border-[#002d72]' : 'bg-white text-slate-400 border-slate-100'}`}>{k.toUpperCase()}</button>
                        ))}
                      </div>
                    )}
                    <textarea
                      value={pasteBuffer}
                      onChange={e => { setPasteBuffer(e.target.value); processTextToData(e.target.value, selectedId!); }}
                      className="w-full h-64 p-4 font-mono text-[10px] border-4 border-slate-100 rounded-[2rem] bg-slate-900 text-emerald-400 shadow-inner focus:border-indigo-500 outline-none"
                      dir="ltr"
                      placeholder="Category	Value1	Value2..."
                    />
                  </div>
                )}

                {selectedSection.type === 'text' && (
                  <div className="space-y-4 text-right">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">תוכן טקסט</label>
                    <textarea value={(selectedSection as TextSection).content} onChange={e => updateSection(selectedId!, { content: e.target.value })} className="w-full h-64 p-4 border rounded-2xl font-bold text-sm bg-slate-50 focus:bg-white shadow-inner" />
                  </div>
                )}

                {selectedSection.type === 'date' && (
                  <div className="space-y-6 text-right">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">תאריכון</label>
                    <input type="text" value={(selectedSection as DateSection).label} onChange={e => updateSection(selectedId!, { label: e.target.value })} className="w-full p-4 border rounded-2xl font-bold mb-4" />
                    <input type="date" value={(selectedSection as DateSection).date} onChange={e => updateSection(selectedId!, { date: e.target.value })} className="w-full p-6 border-4 border-indigo-100 rounded-[2.5rem] font-black text-2xl text-center text-indigo-600" />
                  </div>
                )}

                {selectedSection.type === 'graphic' && (
                  <div className="space-y-6 text-right">
                    <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">גרפיקה / תמונה</label>
                    <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase">הדבק תמונה מהלוח</label>
                      {/* hidden file input triggered on double-click */}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) =>
                        {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () =>
                          {
                            updateSection(selectedId!, { src: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                          // clear value to allow re-uploading same file later
                          e.currentTarget.value = '';
                        }}
                      />

                      <div
                        className="w-full p-4 border-2 border-dashed border-slate-300 rounded-xl min-h-[100px] flex items-center justify-center"
                        onPaste={(e) =>
                        {
                          const items = e.clipboardData?.items;
                          if (!items) return;
                          for (let i = 0; i < items.length; i++)
                          {
                            if (items[i].type.indexOf('image') !== -1)
                            {
                              const blob = items[i].getAsFile();
                              if (!blob) continue;
                              const reader = new FileReader();
                              reader.onload = () =>
                              {
                                // Replace any previous image with the new pasted image
                                updateSection(selectedId!, { src: reader.result as string });
                              };
                              reader.readAsDataURL(blob);
                              break;
                            }
                          }
                        }}
                        tabIndex={0}
                        onClick={(e) => { (e.currentTarget as HTMLDivElement).focus(); }}
                        onDoubleClick={() => { fileInputRef.current?.click(); }}
                        role="button"
                        aria-label="Paste image area"
                      >
                        {((selectedSection as GraphicSection).src) ? (
                          <img src={(selectedSection as GraphicSection).src} alt="pasted" className="max-h-40 max-w-full object-contain" />
                        ) : (
                          <p className="text-slate-400 select-none pointer-events-none">לחץ כאן והדבק תמונה מהלוח (Ctrl+V)</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )
      }
    </div >
  );
};
