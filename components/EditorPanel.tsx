
import React, { useState, useEffect, useRef } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, SummaryEvaluationSection, DatePickerSection, AnomalySection, AnomalyItem, TextSection, PastedGraphicSection } from '../types';

interface EditorPanelProps {
  report: Report;
  onUpdate: (report: any) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onCloseSidebar: () => void;
}

const SECTION_OPTIONS = [
  { type: 'text' as SectionType, label: 'טקסט מעוצב', icon: '📝' },
  { type: 'kpi' as SectionType, label: 'מדדי KPI', icon: '🎯' },
  { type: 'summary_evaluation' as SectionType, label: 'הערכה מסכמת', icon: '⚖️' },
  { type: 'anomaly' as SectionType, label: 'רשימת ממצאים', icon: '🔍' },
  { type: 'date_picker' as SectionType, label: 'תאריכון', icon: '📅' },
  { type: 'data_chart' as SectionType, label: 'גרף נתונים', icon: '📊' },
  { type: 'table' as SectionType, label: 'טבלת נתונים', icon: '📋' },
  { type: 'pasted_graphic' as SectionType, label: 'תמונה / גרפיקה', icon: '🖼️' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ report, onUpdate, selectedId, onSelect, onMove, onCloseSidebar }) => {
  const [pasteBuffer, setPasteBuffer] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sections = (report as any)?.sections || [];
  const selectedSection = sections.find((s: any) => s.id === selectedId);

  // Global Paste Listener for Images
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Trigger only if a graphic section is currently selected
      if (!selectedSection || selectedSection.type !== 'pasted_graphic') return;
      
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            // Prevent default if it's an image paste while graphic editor is open
            e.preventDefault();
            handleImageUpload(blob);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [selectedId, selectedSection]);

  useEffect(() => {
    const section = sections.find((s: any) => s.id === selectedId);
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
  }, [selectedId, sections]);

  const updateSection = (id: string, updates: Partial<Section>) => {
    if (!report) return;
    const newSections = sections.map((s: any) => s.id === id ? { ...s, ...updates } : s);
    onUpdate({ 
      ...report, 
      sections: newSections
    });
  };

  const updateStyles = (id: string, styleUpdates: Partial<SectionStyles>) => {
    const section = sections.find((s: any) => s.id === id);
    if (!section) return;
    updateSection(id, { styles: { ...(section.styles || {}), ...styleUpdates } });
  };

  const handleDataPaste = (text: string, sectionId: string) => {
    const section = sections.find((s: any) => s.id === sectionId);
    if (!text || !text.trim() || !section) return;
    const lines = text.trim().split(/\r?\n/).map(l => l.split(/\t|,/).map(cell => cell.trim()));
    if (section.type === 'table') {
      updateSection(sectionId, { headers: lines[0] || [], rows: lines.slice(1) || [] } as any);
    } else if (section.type === 'data_chart') {
      const firstRow = lines[0];
      const dataRows = lines.slice(1);
      const xKey = firstRow[0] || 'x';
      const seriesKeys = firstRow.slice(1);
      const parsedData = dataRows.map(row => {
        const obj: Record<string, any> = { [xKey]: row[0] || '' };
        seriesKeys.forEach((key, i) => {
          const val = parseFloat(row[i + 1]?.replace(/[^\d.-]/g, ''));
          obj[key] = isNaN(val) ? 0 : val;
        });
        return obj;
      });
      updateSection(sectionId, { data: parsedData, xKey, seriesKeys } as any);
    }
  };

  const handleImageUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (selectedId) {
        updateSection(selectedId, { src: base64 } as any);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 shadow-xl" dir="rtl">
      <div className="p-8 bg-[#002d72] text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">מעצב הדו"ח</h2>
          <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1">Professional Content Studio</p>
        </div>
        <button onClick={onCloseSidebar} className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 custom-scrollbar">
        <button onClick={() => onSelect('tab-settings')} className={`w-full p-4 rounded-2xl border-2 flex items-center gap-3 text-right transition-all ${selectedId === 'tab-settings' ? 'border-emerald-500 bg-white shadow-lg' : 'bg-emerald-50/20 border-emerald-100 hover:border-emerald-200'}`}>
            <span className="text-2xl">⚙️</span>
            <div><p className="font-black text-emerald-700 text-sm leading-none mb-1">הגדרות טאב</p><p className="text-[10px] text-slate-400">ערוך כותרת, אייקון ותקציר</p></div>
        </button>

        <div className="h-px bg-slate-200 my-2"></div>

        {sections.map((sec: any) => (
          <button key={sec.id} onClick={() => onSelect(sec.id)} className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between text-right transition-all ${selectedId === sec.id ? 'border-[#002d72] bg-white shadow-lg' : 'bg-white border-transparent hover:border-slate-100 shadow-sm'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl opacity-40">{SECTION_OPTIONS.find(o => o.type === sec.type)?.icon}</span>
              <div><p className={`font-black text-sm leading-none mb-1 ${selectedId === sec.id ? 'text-[#002d72]' : 'text-slate-700'}`}>{sec.title || 'ללא כותרת'}</p><p className="text-[10px] text-slate-400">{sec.type.toUpperCase()}</p></div>
            </div>
          </button>
        ))}

        <div className="grid grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-200">
          {SECTION_OPTIONS.map(opt => (
            <button key={opt.type} onClick={() => {
                const id = `sec-${Date.now()}`;
                const newSec = { 
                  id, type: opt.type, title: opt.label, 
                  styles: { colSpan: 12, height: opt.type === 'summary_evaluation' ? 700 : 400, fontScale: 1, dataFontScale: 1, labelFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'summary_evaluation' ? { briefingText: 'הזן סיכום הערכה...', score: 4, scoreLabel: 'תקין', footerLabel: 'COMPLIANCE MAGNITUDE VERIFIED', recommendations: [], deficiencies: [] } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד חדש', value: '0', delta: '+0%' }] } : {}),
                  ...(opt.type === 'date_picker' ? { date: new Date().toISOString().split('T')[0], label: 'תאריך הדו"ח' } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [{x: 'א', y: 10}], xKey: 'x', seriesKeys: ['y'] } : {}),
                  ...(opt.type === 'table' ? { headers: ['כותרת 1', 'כותרת 2'], rows: [['נתון 1', 'נתון 2']] } : {}),
                  ...(opt.type === 'anomaly' ? { items: [{ id: '1', title: 'ממצא לדוגמה', department: 'כללי', status: 'בטיפול', riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-001', protocolStatus: 'בטיפול' }] } : {}),
                  ...(opt.type === 'text' ? { content: 'הקלד טקסט כאן...' } : {}),
                  ...(opt.type === 'pasted_graphic' ? { src: '', caption: 'תיאור תמונה' } : {})
                };
                if (!report) return;
                onUpdate({ ...report, sections: [...sections, newSec] });
                onSelect(id);
            }} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-[#002d72] hover:text-white transition-all text-xs font-bold shadow-sm">
              <span className="text-2xl">{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(selectedSection || selectedId === 'tab-settings') && (
        <div className="h-[75%] border-t bg-white p-8 overflow-y-auto shadow-2xl z-50 custom-scrollbar animate-in slide-in-from-bottom duration-300 text-right">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <h3 className="text-xl font-black text-[#002d72]">{selectedId === 'tab-settings' ? 'הגדרות טאב' : `עריכת ${SECTION_OPTIONS.find(o => o.type === selectedSection?.type)?.label}`}</h3>
            <button onClick={() => onSelect(null)} className="text-slate-300 font-bold hover:text-slate-600">סגור ✕</button>
          </div>

          <div className="space-y-10 pb-32">
            {selectedId === 'tab-settings' ? (
                <div className="space-y-6">
                    <div className="space-y-2"><label className="text-xs font-black text-slate-400">אייקון</label><input type="text" value={(report as any).tabIcon || ''} onChange={e => onUpdate({...report, tabIcon: e.target.value})} className="w-full p-4 border rounded-2xl font-bold text-2xl text-center" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-400">שם הטאב</label><input type="text" value={(report as any).tabTitle || ''} onChange={e => onUpdate({...report, tabTitle: e.target.value})} className="w-full p-4 border rounded-2xl font-bold" /></div>
                    <div className="space-y-2"><label className="text-xs font-black text-slate-400">תקציר (SubTitle)</label><input type="text" value={(report as any).tabSubTitles || ''} onChange={e => onUpdate({...report, tabSubTitles: e.target.value})} className="w-full p-4 border rounded-2xl font-bold" /></div>
                </div>
            ) : selectedSection && (
                <>
                    <div className="space-y-4">
                        <label className="text-xs font-black text-slate-400">כותרת האובייקט</label>
                        <input type="text" value={selectedSection.title || ''} onChange={e => updateSection(selectedId!, { title: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" />
                    </div>

                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl">
                        <div className="space-y-1"><label className="text-[10px] font-black">רוחב (1-12)</label><input type="number" min="1" max="12" value={selectedSection.styles?.colSpan || 12} onChange={e => updateStyles(selectedId!, { colSpan: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg font-bold" /></div>
                        <div className="space-y-1"><label className="text-[10px] font-black">גובה (px)</label><input type="number" min="100" max="1500" value={selectedSection.styles?.height || 400} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg font-bold" /></div>
                    </div>

                    {/* KPI Editor */}
                    {selectedSection.type === 'kpi' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת מדדי KPI</label>
                            <div className="space-y-4">
                                {(selectedSection as KPISection).metrics.map((m, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-4 relative shadow-inner">
                                        <button 
                                          onClick={() => {
                                            const newMetrics = [...(selectedSection as KPISection).metrics];
                                            newMetrics.splice(idx, 1);
                                            updateSection(selectedId!, { metrics: newMetrics });
                                          }}
                                          className="absolute top-4 left-4 text-rose-500 text-xs font-black"
                                        >מחק</button>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400">שם המדד (Label)</label>
                                            <input type="text" value={m.label} onChange={e => {
                                                const newMetrics = [...(selectedSection as KPISection).metrics];
                                                newMetrics[idx].label = e.target.value;
                                                updateSection(selectedId!, { metrics: newMetrics });
                                            }} className="w-full p-3 border rounded-xl font-bold text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400">ערך (Value)</label>
                                                <input type="text" value={m.value} onChange={e => {
                                                    const newMetrics = [...(selectedSection as KPISection).metrics];
                                                    newMetrics[idx].value = e.target.value;
                                                    updateSection(selectedId!, { metrics: newMetrics });
                                                }} className="w-full p-3 border rounded-xl font-bold text-sm text-indigo-600" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400">שינוי (Delta)</label>
                                                <input type="text" value={m.delta || ''} onChange={e => {
                                                    const newMetrics = [...(selectedSection as KPISection).metrics];
                                                    newMetrics[idx].delta = e.target.value;
                                                    updateSection(selectedId!, { metrics: newMetrics });
                                                }} className="w-full p-3 border rounded-xl font-bold text-sm text-emerald-600" placeholder="+0%" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <button 
                                    onClick={() => updateSection(selectedId!, { metrics: [...(selectedSection as KPISection).metrics, { label: 'מדד חדש', value: '0' }] })}
                                    className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-600 rounded-[2rem] font-black text-xs hover:bg-indigo-50 transition-colors"
                                >+ הוסף מדד KPI חדש</button>
                            </div>
                        </div>
                    )}

                    {/* Date Picker Editor */}
                    {selectedSection.type === 'date_picker' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת תאריכון</label>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">תווית מעל התאריך</label>
                                    <input type="text" value={(selectedSection as DatePickerSection).label} onChange={e => updateSection(selectedId!, { label: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">בחר תאריך</label>
                                    <input type="date" value={(selectedSection as DatePickerSection).date} onChange={e => updateSection(selectedId!, { date: e.target.value })} className="w-full p-6 border-4 border-indigo-100 rounded-[2.5rem] font-black text-2xl text-center text-indigo-600 focus:border-indigo-500 outline-none transition-all" />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedSection.type === 'summary_evaluation' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2">עריכת הערכה מסכמת</label>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400">טקסט סיכום (Briefing)</label>
                                    <textarea value={(selectedSection as SummaryEvaluationSection).briefingText} onChange={e => updateSection(selectedId!, { briefingText: e.target.value })} className="w-full p-4 border rounded-2xl font-bold text-sm bg-slate-50" rows={4} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400">ציון (1-5)</label>
                                        <input type="number" min="1" max="5" value={(selectedSection as SummaryEvaluationSection).score} onChange={e => updateSection(selectedId!, { score: parseInt(e.target.value) })} className="w-full p-2 border rounded-xl font-bold" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400">תווית ציון</label>
                                        <input type="text" value={(selectedSection as SummaryEvaluationSection).scoreLabel} onChange={e => updateSection(selectedId!, { scoreLabel: e.target.value })} className="w-full p-2 border rounded-xl font-bold" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400">טקסט תחתון (Footer)</label>
                                    <input type="text" value={(selectedSection as SummaryEvaluationSection).footerLabel || ''} onChange={e => updateSection(selectedId!, { footerLabel: e.target.value })} className="w-full p-3 border rounded-xl font-bold text-xs" />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedSection.type === 'table' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2">עריכת טבלת נתונים</label>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">כותרות (מופרד בפסיק)</label>
                                    <input type="text" value={(selectedSection as TableSection).headers.join(', ')} onChange={e => updateSection(selectedId!, { headers: e.target.value.split(',').map(s => s.trim()) })} className="w-full p-3 border rounded-xl font-bold text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">הדבק מאקסל (Paste here)</label>
                                    <textarea value={pasteBuffer} onPaste={(e) => handleDataPaste(e.clipboardData.getData('text'), selectedId!)} onChange={e => setPasteBuffer(e.target.value)} className="w-full h-32 p-4 font-mono text-[10px] border rounded-2xl bg-slate-900 text-emerald-400 shadow-inner" dir="ltr" placeholder="הדבק נתונים כאן..." />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Image / Graphic Editor */}
                    {selectedSection.type === 'pasted_graphic' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">העלאת / הדבקת תמונה</label>
                            
                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 mb-4">
                                <span className="text-xl">💡</span>
                                <p className="text-[11px] font-bold text-amber-800 leading-tight">ניתן להדביק תמונה ישירות (Ctrl+V) בכל רגע שבו האובייקט הזה נבחר בעורך, או ללחוץ כאן להעלאת קובץ.</p>
                            </div>

                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-56 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group relative overflow-hidden"
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) handleImageUpload(file);
                                }} />
                                
                                <div className="flex flex-col items-center justify-center z-10 text-center px-8">
                                    <span className="text-5xl mb-3 group-hover:scale-110 transition-transform">🖼️</span>
                                    <p className="text-sm font-black text-slate-500 group-hover:text-indigo-600">לחץ לבחירת קובץ</p>
                                    <p className="text-[10px] text-slate-400 mt-2 uppercase tracking-widest font-black">או פשוט הדבק Ctrl+V</p>
                                </div>
                                
                                <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            </div>

                            {(selectedSection as PastedGraphicSection).src && (
                                <div className="relative rounded-[2rem] overflow-hidden border-4 border-white shadow-xl group/preview aspect-video bg-slate-100">
                                    <img src={(selectedSection as PastedGraphicSection).src} className="w-full h-full object-contain" alt="Preview" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                         <button 
                                          onClick={(e) => { e.stopPropagation(); updateSection(selectedId!, { src: '' } as any); }}
                                          className="bg-rose-500 text-white px-6 py-2 rounded-full font-black text-xs shadow-lg transform translate-y-4 group-hover/preview:translate-y-0 transition-transform"
                                        >מחק תמונה ✕</button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400">כותרת / תיאור גרפיקה</label>
                                <input type="text" value={(selectedSection as PastedGraphicSection).caption || ''} onChange={e => updateSection(selectedId!, { caption: e.target.value })} className="w-full p-4 border rounded-2xl font-bold text-sm" placeholder="הזן תיאור כאן..." />
                            </div>
                        </div>
                    )}

                    {selectedSection.type === 'anomaly' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">ניהול רשימת ממצאים</label>
                            <button onClick={() => updateSection(selectedId!, { items: [...((selectedSection as AnomalySection).items || []), { id: `an-${Date.now()}`, title: 'ממצא חדש', department: 'כללי', status: 'בטיפול', riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-001', protocolStatus: 'בטיפול' }] })} className="w-full py-4 bg-indigo-600 text-white rounded-3xl font-black text-xs shadow-md">+ הוסף ממצא חדש</button>
                            <div className="space-y-4">
                                {((selectedSection as AnomalySection).items || []).map((item, idx) => (
                                    <div key={item.id} className="p-6 border-2 rounded-[2rem] bg-slate-50 relative space-y-4 shadow-inner">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-[10px] font-black text-slate-400">ממצא #{idx + 1}</span>
                                            <button onClick={() => updateSection(selectedId!, { items: (selectedSection as AnomalySection).items.filter((_, i) => i !== idx) })} className="text-rose-500 font-bold text-xs">מחק</button>
                                        </div>
                                        <input type="text" value={item.title} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items]; items[idx].title = e.target.value; updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl font-bold text-xs" placeholder="כותרת הממצא" />
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" value={item.department} onChange={e => {
                                                const items = [...(selectedSection as AnomalySection).items]; items[idx].department = e.target.value; updateSection(selectedId!, { items });
                                            }} className="p-3 border rounded-xl text-[10px] font-bold" placeholder="חטיבה" />
                                            <div className="flex items-center gap-2">
                                                <label className="text-[9px] font-black text-slate-400">סיכון</label>
                                                <input type="number" min="1" max="5" value={item.riskLevel} onChange={e => {
                                                    const items = [...(selectedSection as AnomalySection).items]; items[idx].riskLevel = parseInt(e.target.value) || 1; updateSection(selectedId!, { items });
                                                }} className="w-12 p-3 border rounded-xl text-center font-black text-rose-500 bg-white" />
                                            </div>
                                        </div>
                                        <textarea value={item.detailedReport} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items]; items[idx].detailedReport = e.target.value; updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl text-[10px] h-20" placeholder="פירוט הממצא (צד ימין)" />
                                        <textarea value={item.riskAnalysis} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items]; items[idx].riskAnalysis = e.target.value; updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl text-[10px] h-20" placeholder="ניתוח סיכונים (צד שמאל)" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {selectedSection.type === 'text' && (
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400">תוכן טקסט</label>
                            <textarea value={(selectedSection as TextSection).content} onChange={e => updateSection(selectedId!, { content: e.target.value })} className="w-full h-64 p-4 border rounded-2xl font-bold text-sm bg-slate-50 focus:bg-white transition-all shadow-inner" />
                        </div>
                    )}

                    {selectedSection.type === 'data_chart' && (
                        <div className="space-y-4">
                            <label className="text-xs font-black text-slate-400">נתונים (הדבק מאקסל)</label>
                            <textarea value={pasteBuffer} onPaste={(e) => handleDataPaste(e.clipboardData.getData('text'), selectedId!)} onChange={e => setPasteBuffer(e.target.value)} className="w-full h-48 p-4 font-mono text-[10px] border rounded-2xl bg-slate-900 text-emerald-400 shadow-inner" dir="ltr" placeholder="הדבק כאן נתונים בפורמט טבלאי..." />
                        </div>
                    )}

                    <button onClick={() => { if(confirm('למחוק לצמיתות?')) { 
                        if (!report) return;
                        onUpdate({...report, sections: sections.filter((s: any) => s.id !== selectedId)}); onSelect(null); 
                    } }} className="w-full py-6 bg-rose-50 text-rose-600 font-black rounded-[2.5rem] border-2 border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-md mt-10">מחיקת אובייקט מהדו"ח ✕</button>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
