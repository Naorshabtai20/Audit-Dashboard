
import React, { useState, useEffect } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, KPIMetric, PastedGraphicSection } from '../types';

interface EditorPanelProps {
  report: Report;
  onUpdate: (report: Report) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onCloseSidebar: () => void;
}

const SECTION_OPTIONS = [
  { type: 'text' as SectionType, label: 'טקסט מעוצב', icon: '📝' },
  { type: 'kpi' as SectionType, label: 'מדדי KPI', icon: '🎯' },
  { type: 'data_chart' as SectionType, label: 'גרף נתונים', icon: '📊' },
  { type: 'table' as SectionType, label: 'טבלת נתונים', icon: '📅' },
  { type: 'pasted_graphic' as SectionType, label: 'תמונה / גרפיקה', icon: '🖼️' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ report, onUpdate, selectedId, onSelect, onMove, onCloseSidebar }) => {
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [clipboard, setClipboard] = useState<Section | null>(null);

  useEffect(() => {
    const section = report.sections.find(s => s.id === selectedId);
    if (!section) {
      setPasteBuffer('');
      return;
    }

    if (section.type === 'table') {
      const table = section as TableSection;
      setPasteBuffer([(table.headers || []).join('\t'), ...(table.rows || []).map(r => r.join('\t'))].join('\n'));
    } else if (section.type === 'data_chart') {
      const chart = section as DataChartSection;
      if (!chart.data || chart.data.length === 0) { setPasteBuffer(''); return; }
      const headers = [chart.xKey || 'x', ...(chart.seriesKeys || [])].join('\t');
      const rows = chart.data.map(row => [row[chart.xKey || 'x'], ...(chart.seriesKeys || []).map(k => row[k])].join('\t')).join('\n');
      setPasteBuffer(headers + '\n' + rows);
    }
  }, [selectedId]);

  const updateSection = (id: string, updates: Partial<Section>) => {
    onUpdate({ 
      ...report, 
      sections: report.sections.map(s => s.id === id ? { ...s, ...updates } as any : s) 
    });
  };

  const updateStyles = (id: string, styleUpdates: Partial<SectionStyles>) => {
    const section = report.sections.find(s => s.id === id);
    if (!section) return;
    updateSection(id, { styles: { ...(section.styles || {}), ...styleUpdates } });
  };

  const updateKPIMetric = (sectionId: string, metricIndex: number, updates: Partial<KPIMetric>) => {
    const section = report.sections.find(s => s.id === sectionId) as KPISection;
    if (!section || section.type !== 'kpi') return;
    const newMetrics = [...section.metrics];
    newMetrics[metricIndex] = { ...newMetrics[metricIndex], ...updates };
    
    if (updates.delta !== undefined) {
        const numericDelta = parseFloat(updates.delta.toString().replace(/[^\d.-]/g, ''));
        newMetrics[metricIndex].trend = numericDelta < 0 ? 'down' : numericDelta > 0 ? 'up' : 'flat';
    }
    
    updateSection(sectionId, { metrics: newMetrics });
  };

  const addKPIMetric = (sectionId: string) => {
    const section = report.sections.find(s => s.id === sectionId) as KPISection;
    if (!section) return;
    const newMetrics = [...(section.metrics || []), { label: 'מדד חדש', value: '1,000', delta: '+10%', trend: 'up' }];
    updateSection(sectionId, { metrics: newMetrics } as any);
  };

  const removeKPIMetric = (sectionId: string, index: number) => {
    const section = report.sections.find(s => s.id === sectionId) as KPISection;
    if (!section) return;
    updateSection(sectionId, { metrics: section.metrics.filter((_, i) => i !== index) });
  };

  const handleCut = (id: string) => {
    const section = report.sections.find(s => s.id === id);
    if (!section) return;
    setClipboard(JSON.parse(JSON.stringify(section))); 
    onUpdate({ ...report, sections: report.sections.filter(s => s.id !== id) });
    onSelect(null);
  };

  const handleCopy = (id: string) => {
    const section = report.sections.find(s => s.id === id);
    if (!section) return;
    setClipboard(JSON.parse(JSON.stringify(section)));
  };

  const handlePasteObject = () => {
    if (!clipboard) return;
    const newId = `sec-${Date.now()}`;
    onUpdate({ ...report, sections: [...report.sections, { ...JSON.parse(JSON.stringify(clipboard)), id: newId }] });
    onSelect(newId);
  };

  const handleImagePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const blob = item.getAsFile();
        if (!blob) continue;
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          if (selectedId) updateSection(selectedId, { src: base64 } as any);
        };
        reader.readAsDataURL(blob);
      }
    }
  };

  const handleDataPaste = (text: string, sectionId: string) => {
    const section = report.sections.find(s => s.id === sectionId);
    if (!text || !text.trim() || !section) return;

    const lines = text.trim().split(/\r?\n/).map(l => l.split(/\t|,/).map(cell => cell.trim()));
    if (lines.length === 0) return;

    if (section.type === 'table') {
      updateSection(sectionId, { headers: lines[0] || [], rows: lines.slice(1) || [] } as any);
    } else if (section.type === 'data_chart') {
      const firstRow = lines[0];
      const isLikelyData = (val: string) => !isNaN(parseFloat(val?.replace(/[^\d.-]/g, '')));
      const hasHeader = firstRow.slice(1).some(cell => !isLikelyData(cell));
      
      let xKey = hasHeader ? firstRow[0] || 'ציר X' : 'ציר X';
      let seriesKeys = hasHeader ? firstRow.slice(1).map((h, i) => h || `סדרה ${i + 1}`) : firstRow.slice(1).map((_, i) => `סדרה ${i + 1}`);
      let dataRows = hasHeader ? lines.slice(1) : lines;

      const parsedData = dataRows.map(row => {
        const obj: Record<string, any> = { [xKey]: row[0] || '' };
        seriesKeys.forEach((key, i) => {
          const val = parseFloat((row[i + 1] || '0').replace(/[^\d.-]/g, ''));
          obj[key] = isNaN(val) ? 0 : val;
        });
        return obj;
      }).filter(item => item[xKey] !== '');

      updateSection(sectionId, { data: parsedData, xKey, seriesKeys } as any);
    }
  };

  const selectedSection = report.sections.find(s => s.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200" dir="rtl">
      {/* Header */}
      <div className="p-10 bg-[#002d72] text-white shadow-xl flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight leading-tight">מעצב הדו"ח</h2>
          <p className="text-[12px] opacity-60 uppercase tracking-[0.2em] mt-2 font-bold">Designer Tools Pro</p>
        </div>
        <button onClick={onCloseSidebar} className="p-4 bg-white/10 hover:bg-white/20 rounded-2xl transition-all font-bold text-sm">סגור</button>
      </div>

      {/* Main Content List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#f8f9fc] custom-scrollbar">
        <div className="flex justify-between items-center px-2">
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">רשימת אובייקטים</p>
            {clipboard && (
                <button onClick={handlePasteObject} className="bg-emerald-500 text-white text-[12px] font-bold px-5 py-2.5 rounded-2xl hover:bg-emerald-600 shadow-lg transition-all">
                    📋 הדבק אובייקט
                </button>
            )}
        </div>

        {report.sections.map((sec) => (
          <button 
            key={sec.id} 
            onClick={() => onSelect(sec.id)}
            className={`w-full p-6 rounded-[2rem] border-2 text-right transition-all flex items-center justify-between group ${
              selectedId === sec.id ? 'border-[#002d72] bg-white shadow-xl translate-x-2' : 'border-transparent bg-white hover:border-slate-200 shadow-md'
            }`}
          >
            <div className="flex items-center gap-4 overflow-hidden">
              <span className="text-3xl opacity-70 shrink-0">{SECTION_OPTIONS.find(o => o.type === sec.type)?.icon}</span>
              <div className="flex flex-col text-right overflow-hidden">
                <span className={`font-bold text-xl truncate ${selectedId === sec.id ? 'text-[#002d72]' : 'text-slate-700'}`}>{sec.title || 'ללא כותרת'}</span>
                <span className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sec.styles?.colSpan || 12}/12 עמודות</span>
              </div>
            </div>
          </button>
        ))}
        
        {/* Creation Buttons */}
        <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
          {SECTION_OPTIONS.map(opt => (
            <button 
              key={opt.type} 
              onClick={() => {
                const id = `sec-${Date.now()}`;
                const newSec = { 
                  id, type: opt.type, title: opt.label, styles: { colSpan: 12, height: opt.type === 'pasted_graphic' ? 500 : 400, fontScale: 1, dataFontScale: 1, labelFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'text' ? { content: 'הזן טקסט כאן...' } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד לדוגמה', value: '1,200', delta: '+5%', trend: 'up' }] } : {}),
                  ...(opt.type === 'table' ? { headers: ['כותרת 1', 'כותרת 2'], rows: [['נתון 1', 'נתון 2']] } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [{ x: 'א', y: 10 }, { x: 'ב', y: 20 }], seriesKeys: ['y'], xKey: 'x' } : {}),
                  ...(opt.type === 'pasted_graphic' ? { src: '', caption: '' } : {})
                };
                onUpdate({ ...report, sections: [...report.sections, newSec as any] });
                onSelect(id);
              }}
              className="flex flex-col items-center gap-3 p-6 bg-white border border-slate-100 rounded-[2.2rem] hover:bg-[#002d72] hover:text-white transition-all text-[15px] font-bold shadow-md"
            >
              <span className="text-4xl">{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Settings Panel */}
      {selectedSection && (
        <div className="h-[85%] border-t border-slate-200 bg-white p-10 overflow-y-auto shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.15)] z-50 custom-scrollbar animate-in slide-in-from-bottom-8">
          <div className="flex justify-between items-center mb-10 border-b border-slate-100 pb-8">
            <h3 className="text-2xl font-extrabold text-[#002d72]">הגדרות ועיצוב אובייקט</h3>
            <div className="flex gap-3">
                <button onClick={() => onSelect(null)} className="w-12 h-12 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-full text-slate-400 font-bold transition-all hover:bg-slate-100">✕</button>
            </div>
          </div>

          <div className="space-y-12 text-right pb-12">
            {/* Visual Properties */}
            <div className="space-y-10 bg-[#f8f9fc] p-10 rounded-[2.5rem] border border-slate-100 shadow-inner">
              <label className="text-xl font-extrabold text-[#002d72] uppercase tracking-[0.05em] block mb-6">מאפייני תצוגה</label>
              
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-slate-600">רוחב (עמודות)</span>
                    <span className="text-xl font-extrabold text-[#002d72]">{selectedSection.styles?.colSpan}</span>
                </div>
                <input type="range" min="1" max="12" step="1" value={selectedSection.styles?.colSpan || 12} onChange={e => updateStyles(selectedId!, { colSpan: parseInt(e.target.value) })} className="w-full h-3 bg-blue-100 rounded-lg accent-[#002d72] cursor-pointer" />
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-slate-600">גובה (פיקסלים)</span>
                    <span className="text-xl font-extrabold text-[#002d72]">{selectedSection.styles?.height}px</span>
                </div>
                <input type="range" min="150" max="1500" step="10" value={selectedSection.styles?.height || 400} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full h-3 bg-blue-100 rounded-lg accent-[#002d72] cursor-pointer" />
              </div>
              
              <div className="space-y-8 pt-4 border-t border-slate-200/50">
                <div className="flex justify-between items-center">
                    <span className="text-xl font-bold text-slate-600">גודל כותרות</span>
                    <span className="text-xl font-extrabold text-[#002d72]">{selectedSection.styles?.fontScale}x</span>
                </div>
                <input type="range" min="0.5" max="6.0" step="0.1" value={selectedSection.styles?.fontScale || 1} onChange={e => updateStyles(selectedId!, { fontScale: parseFloat(e.target.value) })} className="w-full h-3 bg-blue-100 rounded-lg accent-[#002d72] cursor-pointer" />
              </div>

              {(selectedSection.type === 'kpi' || selectedSection.type === 'table') && (
                <>
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-[#002d72] underline">גודל נתונים / ערכים</span>
                        <span className="text-xl font-extrabold text-[#002d72]">{selectedSection.styles?.dataFontScale}x</span>
                    </div>
                    <input type="range" min="0.5" max="5.0" step="0.1" value={selectedSection.styles?.dataFontScale || 1} onChange={e => updateStyles(selectedId!, { dataFontScale: parseFloat(e.target.value) })} className="w-full h-3 bg-blue-100 rounded-lg accent-[#002d72] cursor-pointer" />
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <span className="text-xl font-bold text-[#002d72] opacity-70 italic">גודל תוויות (Labels)</span>
                        <span className="text-xl font-extrabold text-[#002d72] opacity-70">{selectedSection.styles?.labelFontScale || 1}x</span>
                    </div>
                    <input type="range" min="0.5" max="3.0" step="0.1" value={selectedSection.styles?.labelFontScale || 1} onChange={e => updateStyles(selectedId!, { labelFontScale: parseFloat(e.target.value) })} className="w-full h-3 bg-blue-200 rounded-lg accent-[#002d72] cursor-pointer" />
                  </div>
                </>
              )}
            </div>

            {/* Content Properties */}
            <div className="space-y-10">
              <div className="space-y-4">
                <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">כותרת האובייקט</label>
                <input 
                  type="text" 
                  value={selectedSection.title || ''} 
                  onChange={e => updateSection(selectedId!, { title: e.target.value })} 
                  placeholder="הזן כותרת..." 
                  className="w-full p-8 bg-[#f8f9fc] border-2 border-slate-100 rounded-3xl font-extrabold text-2xl text-[#002d72] outline-none focus:border-[#002d72] focus:bg-white transition-all shadow-inner" 
                />
              </div>

              {selectedSection.type === 'kpi' && (
                <div className="space-y-6">
                    <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">עריכת מדדי KPI</label>
                    <div className="space-y-4">
                        {(selectedSection as KPISection).metrics.map((m, idx) => (
                            <div key={idx} className="bg-white border-2 border-slate-100 p-8 rounded-[2rem] shadow-sm space-y-6 relative group">
                                <button 
                                    onClick={() => removeKPIMetric(selectedId!, idx)}
                                    className="absolute top-4 left-4 text-rose-500 hover:text-rose-700 font-bold p-2"
                                >
                                    מחק מדד
                                </button>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-bold text-slate-400 mb-1 block">שם המדד (Label)</label>
                                        <input 
                                            type="text" 
                                            value={m.label} 
                                            onChange={e => updateKPIMetric(selectedId!, idx, { label: e.target.value })}
                                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-lg focus:bg-white outline-none focus:border-[#002d72]"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">ערך (Value)</label>
                                            <input 
                                                type="text" 
                                                value={m.value} 
                                                onChange={e => updateKPIMetric(selectedId!, idx, { value: e.target.value })}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-extrabold text-2xl text-[#002d72] focus:bg-white outline-none focus:border-[#002d72]"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-400 mb-1 block">שינוי (Delta)</label>
                                            <input 
                                                type="text" 
                                                value={m.delta} 
                                                onChange={e => updateKPIMetric(selectedId!, idx, { delta: e.target.value })}
                                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-xl text-emerald-600 focus:bg-white outline-none focus:border-[#002d72]"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button 
                            onClick={() => addKPIMetric(selectedId!)}
                            className="w-full py-6 border-4 border-dashed border-slate-200 rounded-[2rem] text-slate-400 font-extrabold hover:border-[#002d72] hover:text-[#002d72] transition-all"
                        >
                            + הוסף מדד KPI חדש
                        </button>
                    </div>
                </div>
              )}

              {selectedSection.type === 'pasted_graphic' && (
                <div className="space-y-6">
                    <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">העלאת תמונה / גרפיקה</label>
                    <div 
                        className="w-full h-72 border-4 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-400 hover:border-[#002d72] hover:text-[#002d72] transition-all cursor-pointer relative overflow-hidden bg-slate-50 group"
                        onPaste={handleImagePaste}
                        onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                                const file = (e.target as HTMLInputElement).files?.[0];
                                if (file) {
                                    const reader = new FileReader();
                                    reader.onload = (ev) => {
                                        updateSection(selectedId!, { src: ev.target?.result as string } as any);
                                    };
                                    reader.readAsDataURL(file);
                                }
                            };
                            input.click();
                        }}
                    >
                        {(selectedSection as PastedGraphicSection).src ? (
                            <img src={(selectedSection as PastedGraphicSection).src} className="absolute inset-0 w-full h-full object-contain p-4" alt="תצוגה מקדימה" />
                        ) : (
                            <div className="text-center p-6">
                                <span className="text-6xl mb-4 block">🖼️</span>
                                <p className="font-bold text-xl">לחץ לבחירת קובץ או הדבק (Paste) תמונה כאן</p>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <span className="bg-white/90 text-[#002d72] px-6 py-2 rounded-full font-bold shadow-xl">החלף תמונה</span>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-sm font-bold text-slate-400 block px-2">כיתוב לתמונה (Caption)</label>
                        <input 
                            type="text" 
                            value={(selectedSection as PastedGraphicSection).caption || ''} 
                            onChange={e => updateSection(selectedId!, { caption: e.target.value } as any)} 
                            placeholder="הוסף כיתוב למטה..." 
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold focus:bg-white outline-none focus:border-[#002d72]"
                        />
                    </div>
                </div>
              )}

              {selectedSection.type === 'data_chart' && (
                <div className="space-y-6">
                    <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">סוג תצוגה גרפית</label>
                    <div className="grid grid-cols-3 gap-4">
                        {['bar', 'line', 'area', 'pie', 'donut'].map((kind) => {
                            const chart = selectedSection as DataChartSection;
                            const isMulti = (chart.seriesKeys?.length || 0) > 1;
                            const isPie = kind === 'pie' || kind === 'donut';
                            const isDisabled = isMulti && isPie;

                            return (
                                <button 
                                    key={kind} 
                                    disabled={isDisabled}
                                    onClick={() => updateSection(selectedId!, { chartKind: kind as any })} 
                                    className={`py-6 rounded-3xl text-lg font-bold transition-all flex flex-col items-center justify-center border-2 ${
                                        chart.chartKind === kind 
                                        ? 'bg-[#002d72] text-white border-[#002d72] shadow-lg' 
                                        : isDisabled 
                                            ? 'bg-slate-50 text-slate-200 border-slate-100 cursor-not-allowed opacity-50' 
                                            : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="text-3xl mb-2">
                                        {kind === 'bar' ? '📊' : kind === 'line' ? '📈' : kind === 'area' ? '🌊' : '🥧'}
                                    </span>
                                    <span className="capitalize">{kind}</span>
                                    {isDisabled && <span className="text-[10px] mt-1 opacity-60">לא לריבוי סדרות</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
              )}

              {(selectedSection.type === 'data_chart' || selectedSection.type === 'table') && (
                <div className="space-y-5">
                    <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">עריכת נתונים (העתק מאקסל)</label>
                    <textarea 
                        value={pasteBuffer} 
                        onPaste={(e) => { const text = e.clipboardData.getData('text'); handleDataPaste(text, selectedId!); }} 
                        onChange={e => { setPasteBuffer(e.target.value); handleDataPaste(e.target.value, selectedId!); }} 
                        className="w-full h-96 p-8 bg-[#001b44] text-emerald-400 border-2 border-slate-800 rounded-[2.5rem] text-lg font-mono focus:border-emerald-500 outline-none ltr text-left leading-relaxed shadow-2xl transition-all" 
                        placeholder="הדבק כאן טבלה מאקסל..."
                        dir="ltr" 
                    />
                </div>
              )}

              {selectedSection.type === 'text' && (
                <div className="space-y-4">
                    <label className="text-xl font-extrabold text-[#002d72] block px-2 italic">תוכן הטקסט</label>
                    <textarea 
                        value={(selectedSection as any).content} 
                        onChange={e => updateSection(selectedId!, { content: e.target.value } as any)} 
                        className="w-full h-80 p-8 bg-[#f8f9fc] border-2 border-slate-100 rounded-[2.5rem] text-2xl font-bold text-[#002d72] focus:bg-white focus:border-[#002d72] outline-none transition-all shadow-inner leading-relaxed" 
                        placeholder={'הזן את הטקסט כאן...'} 
                    />
                </div>
              )}
            </div>

            <button 
                onClick={() => { if(confirm('למחוק את האובייקט מהדו"ח?')) { onUpdate({...report, sections: report.sections.filter(s => s.id !== selectedId)}); onSelect(null); } }} 
                className="w-full py-8 bg-rose-50 text-rose-600 font-extrabold text-xl uppercase tracking-widest hover:bg-rose-600 hover:text-white rounded-[2.5rem] border-2 border-rose-100 transition-all shadow-md"
            >
                ✕ מחק אובייקט זה
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
