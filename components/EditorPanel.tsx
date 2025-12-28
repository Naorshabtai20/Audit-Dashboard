
import React, { useState, useEffect, useRef } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, PastedGraphicSection } from '../types';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
    } else if (section.type === 'kpi') {
      const kpi = section as KPISection;
      setPasteBuffer((kpi.metrics || []).map(m => `${m.label}\t${m.value}\t${m.delta || ''}`).join('\n'));
    } else {
      setPasteBuffer('');
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

    const lines = text.trim().split(/\r?\n/).map(l => l.split(/\t|,|;/).map(cell => cell.trim()));
    if (lines.length === 0) return;

    if (section.type === 'table') {
      updateSection(sectionId, { headers: lines[0] || [], rows: lines.slice(1) || [] } as any);
    } else if (section.type === 'kpi') {
      const metrics = lines.map(row => {
        const numericDelta = parseFloat((row[2] || '').toString().replace(/[^\d.-]/g, ''));
        return { label: row[0] || 'מדד', value: row[1] || '0', delta: row[2] || '', trend: numericDelta < 0 ? 'down' : numericDelta > 0 ? 'up' : 'flat' };
      });
      updateSection(sectionId, { metrics } as any);
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
      <div className="p-8 bg-slate-900 text-white shadow-xl flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight">מעצב הדו"ח</h2>
          <p className="text-[10px] opacity-40 uppercase tracking-[0.2em] mt-2 font-bold font-mono">Multi-Series Graphic Engine</p>
        </div>
        <button onClick={onCloseSidebar} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all font-bold text-xs">סגור</button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/40 custom-scrollbar">
        <div className="flex justify-between items-center px-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">מבנה הדו"ח</p>
            {clipboard && (
                <button onClick={handlePasteObject} className="bg-emerald-500 text-white text-[9px] font-black px-4 py-2 rounded-xl hover:bg-emerald-600 shadow-lg animate-bounce">
                    📋 הדבק אובייקט
                </button>
            )}
        </div>

        {report.sections.map((sec) => (
          <button 
            key={sec.id} 
            onClick={() => onSelect(sec.id)}
            className={`w-full p-4 rounded-[1.5rem] border-2 text-right transition-all flex items-center justify-between group ${
              selectedId === sec.id ? 'border-blue-600 bg-white shadow-xl translate-x-1' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="text-2xl opacity-60 shrink-0">{SECTION_OPTIONS.find(o => o.type === sec.type)?.icon}</span>
              <div className="flex flex-col text-right overflow-hidden">
                <span className={`font-black text-[12px] truncate ${selectedId === sec.id ? 'text-blue-600' : 'text-slate-700'}`}>{sec.title || 'ללא כותרת'}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{sec.styles?.colSpan || 12}/12 עמודות</span>
              </div>
            </div>
          </button>
        ))}
        
        <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-200">
          {SECTION_OPTIONS.map(opt => (
            <button 
              key={opt.type} 
              onClick={() => {
                const id = `sec-${Date.now()}`;
                const newSec = { 
                  id, type: opt.type, title: opt.label, styles: { colSpan: 12, height: opt.type === 'pasted_graphic' ? 500 : 400, fontScale: 1, dataFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'text' ? { content: 'הזן טקסט...' } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [] } : {}),
                  ...(opt.type === 'table' ? { headers: [], rows: [] } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [], seriesKeys: [], xKey: '' } : {}),
                  ...(opt.type === 'pasted_graphic' ? { src: '', caption: '' } : {})
                };
                onUpdate({ ...report, sections: [...report.sections, newSec as any] });
                onSelect(id);
              }}
              className="flex flex-col items-center gap-2 p-5 bg-white border border-slate-100 rounded-[1.5rem] hover:bg-blue-600 hover:text-white transition-all text-[11px] font-black shadow-sm"
            >
              <span className="text-3xl">{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {selectedSection && (
        <div className="h-[80%] border-t border-slate-200 bg-white p-8 overflow-y-auto shadow-2xl z-50 custom-scrollbar animate-in slide-in-from-bottom-5">
          <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
            <h3 className="text-xl font-black text-slate-900">הגדרות ועיצוב</h3>
            <div className="flex gap-2">
                <button onClick={() => handleCut(selectedId!)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-rose-500 hover:text-white transition-all">✂️</button>
                <button onClick={() => handleCopy(selectedId!)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-xl hover:bg-blue-500 hover:text-white transition-all">📋</button>
                <button onClick={() => onSelect(null)} className="w-10 h-10 flex items-center justify-center bg-slate-100 rounded-full text-slate-400 font-bold transition-colors">✕</button>
            </div>
          </div>

          <div className="space-y-8 text-right pb-10">
            <div className="space-y-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">מידות ותצוגה</label>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">רוחב (1-12)</span><span className="text-[10px] font-black text-blue-600">{selectedSection.styles?.colSpan}</span></div>
                <input type="range" min="1" max="12" step="1" value={selectedSection.styles?.colSpan || 12} onChange={e => updateStyles(selectedId!, { colSpan: parseInt(e.target.value) })} className="w-full h-1.5 bg-blue-100 accent-blue-600" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center"><span className="text-xs font-bold text-slate-500">גובה אובייקט</span><span className="text-[10px] font-black text-blue-600">{selectedSection.styles?.height}px</span></div>
                <input type="range" min="150" max="1500" step="10" value={selectedSection.styles?.height || 400} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full h-1.5 bg-blue-100 accent-blue-600" />
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">
                        {selectedSection.type === 'text' ? 'גודל טקסט' : 'גודל כותרות'}
                    </span>
                    <span className="text-[10px] font-black text-blue-600">{selectedSection.styles?.fontScale}x</span>
                </div>
                <input type="range" min="0.5" max="6.0" step="0.1" value={selectedSection.styles?.fontScale || 1} onChange={e => updateStyles(selectedId!, { fontScale: parseFloat(e.target.value) })} className="w-full h-1.5 bg-blue-100 accent-blue-600" />
              </div>

              {(selectedSection.type === 'kpi' || selectedSection.type === 'table') && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex justify-between items-center"><span className="text-xs font-black text-rose-500 uppercase">גודל נתונים (Data Scale)</span><span className="text-[10px] font-black text-rose-600">{selectedSection.styles?.dataFontScale}x</span></div>
                  <input type="range" min="0.5" max="5.0" step="0.1" value={selectedSection.styles?.dataFontScale || 1} onChange={e => updateStyles(selectedId!, { dataFontScale: parseFloat(e.target.value) })} className="w-full h-2 bg-rose-100 accent-rose-600" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest block">תוכן ונתונים</label>
              <input type="text" value={selectedSection.title || ''} onChange={e => updateSection(selectedId!, { title: e.target.value })} placeholder="כותרת..." className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-blue-500" />

              {selectedSection.type === 'data_chart' && (
                <div className="space-y-3">
                    <label className="text-[9px] font-bold text-slate-400">סוג הגרף (מותאם לנתונים)</label>
                    <div className="grid grid-cols-3 gap-2">
                        {['bar', 'line', 'area', 'pie', 'donut'].map(k => {
                            const chartSec = selectedSection as DataChartSection;
                            // Pie/Donut are relevant only for single series
                            const isMultiSeries = (chartSec.seriesKeys?.length || 0) > 1;
                            const isPieKind = k === 'pie' || k === 'donut';
                            const isDisabled = isMultiSeries && isPieKind;
                            
                            return (
                                <button 
                                    key={k} 
                                    disabled={isDisabled}
                                    onClick={() => updateSection(selectedId!, { chartKind: k } as any)} 
                                    className={`py-2 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center ${ 
                                        chartSec.chartKind === k 
                                        ? 'bg-blue-600 text-white shadow-lg' 
                                        : isDisabled 
                                            ? 'bg-slate-50 text-slate-200 cursor-not-allowed border border-slate-100' 
                                            : 'bg-slate-100 text-slate-400 hover:bg-slate-200' 
                                    }`}
                                    title={isDisabled ? 'גרף עוגה מתאים לסדרת נתונים אחת בלבד' : ''}
                                >
                                    {k}
                                    {isDisabled && <span className="text-[6px] opacity-60">לא מתאים</span>}
                                </button>
                            );
                        })}
                    </div>
                </div>
              )}

              {selectedSection.type === 'pasted_graphic' && (
                <div className="space-y-3">
                  <div onPaste={handleImagePaste} className="w-full h-40 border-4 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer overflow-hidden">
                    {(selectedSection as any).src ? <img src={(selectedSection as any).src} className="w-full h-full object-cover" /> : <div className="text-center font-bold text-[10px]">הדבק כאן תמונה מאקסל (Ctrl+V)</div>}
                  </div>
                  <input type="text" value={(selectedSection as any).caption || ''} onChange={e => updateSection(selectedId!, { caption: e.target.value } as any)} placeholder="תיאור תמונה..." className="w-full p-3 bg-slate-50 border rounded-xl text-xs" />
                </div>
              )}

              {(selectedSection.type === 'data_chart' || selectedSection.type === 'table' || selectedSection.type === 'kpi') && (
                <textarea value={pasteBuffer} onPaste={(e) => { const text = e.clipboardData.getData('text'); handleDataPaste(text, selectedId!); }} onChange={e => { setPasteBuffer(e.target.value); handleDataPaste(e.target.value, selectedId!); }} className="w-full h-64 p-5 bg-slate-900 text-blue-400 border-2 border-slate-800 rounded-3xl text-[11px] font-mono focus:border-blue-500 outline-none ltr text-left" placeholder="הדבק כאן את הטבלה מאקסל..." dir="ltr" />
              )}
              {selectedSection.type === 'text' && (
                <textarea value={(selectedSection as any).content} onChange={e => updateSection(selectedId!, { content: e.target.value } as any)} className="w-full h-56 p-5 bg-slate-50 border border-slate-200 rounded-3xl text-sm" placeholder="הזן טקסט..." />
              )}
            </div>

            <button onClick={() => { if(confirm('למחוק?')) { onUpdate({...report, sections: report.sections.filter(s => s.id !== selectedId)}); onSelect(null); } }} className="w-full py-5 bg-rose-50 text-rose-600 font-black text-[10px] uppercase hover:bg-rose-600 hover:text-white rounded-3xl border-2 border-rose-100 transition-all">✕ מחק מהדו"ח</button>
          </div>
        </div>
      )}
    </div>
  );
};
