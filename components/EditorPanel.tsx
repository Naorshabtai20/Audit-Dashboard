
import React, { useState, useEffect, useRef } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, SummaryEvaluationSection, DatePickerSection, AnomalySection, AnomalyItem, TextSection, PastedGraphicSection } from '../types';

interface EditorPanelProps {
  /**
   * Changed report type to any to support passing active tab metadata (tabTitle, tabIcon, tabSubTitles) 
   * and sections directly to the EditorPanel, resolving property check errors at the call site.
   */
  report: any;
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
      if (!selectedSection || selectedSection.type !== 'pasted_graphic') return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
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

  // Sync pasteBuffer with section data
  useEffect(() => {
    const section = sections.find((s: any) => s.id === selectedId);
    if (!section) {
      setPasteBuffer('');
      return;
    }
    if (section.type === 'table') {
      const table = section as TableSection;
      setPasteBuffer([(table.headers || []).join('\t'), ...(table.rows || []).map(r => (r || []).join('\t'))].join('\n'));
    } else if (section.type === 'data_chart') {
      const chart = section as DataChartSection;
      if (!chart.data || chart.data.length === 0) { setPasteBuffer(''); return; }
      const headers = [chart.xKey || 'x', ...(chart.seriesKeys || [])].join('\t');
      const rows = chart.data.map(row => [row[chart.xKey || 'x'], ...(chart.seriesKeys || []).map(k => row[k])].join('\t')).join('\n');
      setPasteBuffer(headers + '\n' + rows);
    }
  }, [selectedId, selectedSection]);

  const updateSection = (id: string, updates: Partial<Section>) => {
    if (!report) return;
    const newSections = sections.map((s: any) => s.id === id ? { ...s, ...updates } : s);
    onUpdate({ ...report, sections: newSections });
  };

  const updateStyles = (id: string, styleUpdates: Partial<SectionStyles>) => {
    const section = sections.find((s: any) => s.id === id);
    if (!section) return;
    updateSection(id, { styles: { ...(section.styles || {}), ...styleUpdates } });
  };

  const processTextToData = (text: string, sectionId: string) => {
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
          const rawVal = (row[i + 1] || '0').replace(/[^\d.-]/g, '');
          const val = parseFloat(rawVal);
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
      if (selectedId) updateSection(selectedId, { src: base64 } as any);
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
                  styles: { colSpan: 12, height: opt.type === 'summary_evaluation' ? 900 : 400, fontScale: 1, dataFontScale: 1, labelFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'summary_evaluation' ? { briefingText: 'הזן סיכום הערכה...', score: 4, scoreLabel: 'טעון שיפור', footerLabel: 'COMPLIANCE MAGNITUDE VERIFIED', recommendations: ['המלצה 1'], deficiencies: ['ליקוי 1'] } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד חדש', value: '0', delta: '+0%' }] } : {}),
                  ...(opt.type === 'date_picker' ? { date: new Date().toISOString().split('T')[0], label: 'תאריך הדו"ח' } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [{x: 'א', y: 10}], xKey: 'x', seriesKeys: ['y'] } : {}),
                  ...(opt.type === 'table' ? { headers: ['כותרת 1', 'כותרת 2'], rows: [['נתון 1', 'נתון 2']] } : {}),
                  ...(opt.type === 'anomaly' ? { items: [{ id: `an-${Date.now()}`, title: 'ממצא לדוגמה', department: 'כללי', status: 'בטיפול', riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-001', protocolStatus: 'בטיפול' }] } : {}),
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
          <div className="flex justify-between items-center mb-8 border-b pb-6 sticky top-0 bg-white z-[60]">
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
                        <div className="space-y-1"><label className="text-[10px] font-black">גובה (px)</label><input type="number" min="100" max="2500" value={selectedSection.styles?.height || 900} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full p-2 border rounded-lg font-bold" /></div>
                    </div>

                    {/* TEXT SECTION EDITOR */}
                    {selectedSection.type === 'text' && (
                        <div className="space-y-4">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">תוכן הטקסט</label>
                            <textarea 
                                value={(selectedSection as TextSection).content} 
                                onChange={e => updateSection(selectedId!, { content: e.target.value })} 
                                className="w-full h-64 p-4 border rounded-2xl font-bold text-sm bg-slate-50 focus:bg-white shadow-inner transition-all" 
                                placeholder="הקלד כאן את תוכן הטקסט..."
                            />
                        </div>
                    )}

                    {/* ANOMALY / FINDINGS EDITOR */}
                    {selectedSection.type === 'anomaly' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">ניהול רשימת ממצאים</label>
                            <button 
                                onClick={() => {
                                    const items = [...((selectedSection as AnomalySection).items || [])];
                                    items.push({ 
                                        id: `an-${Date.now()}`, title: 'ממצא חדש', department: 'כללי', status: 'בטיפול', 
                                        riskLevel: 3, riskAnalysis: '', detailedReport: '', internalRef: 'REF-00X', protocolStatus: 'פתוח' 
                                    });
                                    updateSection(selectedId!, { items });
                                }} 
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-indigo-700 transition-all"
                            >+ הוסף ממצא חדש</button>
                            
                            <div className="space-y-6">
                                {((selectedSection as AnomalySection).items || []).map((item, idx) => (
                                    <div key={item.id} className="p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] space-y-4 relative shadow-inner">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400">ממצא #{idx + 1}</span>
                                            <button 
                                                onClick={() => {
                                                    const items = (selectedSection as AnomalySection).items.filter((_, i) => i !== idx);
                                                    updateSection(selectedId!, { items });
                                                }} 
                                                className="text-rose-500 font-bold text-xs"
                                            >מחק</button>
                                        </div>
                                        <input type="text" value={item.title} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items];
                                            items[idx].title = e.target.value;
                                            updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl font-bold text-xs" placeholder="כותרת הממצא" />
                                        
                                        <div className="grid grid-cols-2 gap-3">
                                            <input type="text" value={item.department} onChange={e => {
                                                const items = [...(selectedSection as AnomalySection).items];
                                                items[idx].department = e.target.value;
                                                updateSection(selectedId!, { items });
                                            }} className="p-3 border rounded-xl font-bold text-[10px]" placeholder="חטיבה" />
                                            <select value={item.riskLevel} onChange={e => {
                                                const items = [...(selectedSection as AnomalySection).items];
                                                items[idx].riskLevel = parseInt(e.target.value);
                                                updateSection(selectedId!, { items });
                                            }} className="p-3 border rounded-xl font-bold text-[10px] text-rose-500">
                                                {[1,2,3,4,5].map(v => <option key={v} value={v}>חומרה: {v}</option>)}
                                            </select>
                                        </div>
                                        <textarea value={item.detailedReport} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items];
                                            items[idx].detailedReport = e.target.value;
                                            updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl text-[10px] h-20" placeholder="פירוט הממצא..." />
                                        <textarea value={item.riskAnalysis} onChange={e => {
                                            const items = [...(selectedSection as AnomalySection).items];
                                            items[idx].riskAnalysis = e.target.value;
                                            updateSection(selectedId!, { items });
                                        }} className="w-full p-3 border rounded-xl text-[10px] h-20 bg-rose-50/30" placeholder="ניתוח סיכון..." />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* DATA CHART EDITOR */}
                    {selectedSection.type === 'data_chart' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת נתוני גרף</label>
                            
                            <div className="grid grid-cols-3 gap-2">
                                {(['bar', 'line', 'pie', 'donut'] as const).map(kind => (
                                    <button 
                                        key={kind} 
                                        onClick={() => updateSection(selectedId!, { chartKind: kind })} 
                                        className={`py-2 rounded-xl text-[10px] font-black border-2 transition-all ${selectedSection.chartKind === kind ? 'bg-[#002d72] text-white border-[#002d72]' : 'bg-white text-slate-400 border-slate-100'}`}
                                    >
                                        {kind.toUpperCase()}
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400">הזן נתונים (אקסל או ידני)</label>
                                <textarea 
                                    value={pasteBuffer} 
                                    onPaste={(e) => {
                                        const text = e.clipboardData.getData('text');
                                        setPasteBuffer(text);
                                        processTextToData(text, selectedId!);
                                    }} 
                                    onChange={e => {
                                        setPasteBuffer(e.target.value);
                                        processTextToData(e.target.value, selectedId!);
                                    }} 
                                    className="w-full h-48 p-4 font-mono text-[10px] border rounded-2xl bg-slate-900 text-emerald-400 shadow-inner" 
                                    dir="ltr" 
                                    placeholder="Category	Value1	Value2..."
                                />
                                <p className="text-[9px] text-slate-400 font-bold leading-tight">השורה הראשונה היא כותרות. עמודה ראשונה היא ציר ה-X. השאר הם ערכים. השתמש ב-Tab או פסיק.</p>
                            </div>
                        </div>
                    )}

                    {/* TABLE EDITOR */}
                    {selectedSection.type === 'table' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת טבלת נתונים</label>
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400">כותרות (מופרד בפסיק)</label>
                                    <input 
                                        type="text" 
                                        value={(selectedSection as TableSection).headers.join(', ')} 
                                        onChange={e => updateSection(selectedId!, { headers: e.target.value.split(',').map(s => s.trim()) })} 
                                        className="w-full p-3 border rounded-xl font-bold text-xs" 
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400">הדבק תוכן (אקסל/טקסט)</label>
                                    <textarea 
                                        value={pasteBuffer} 
                                        onChange={e => {
                                            setPasteBuffer(e.target.value);
                                            processTextToData(e.target.value, selectedId!);
                                        }} 
                                        className="w-full h-48 p-4 font-mono text-[10px] border rounded-2xl bg-slate-900 text-emerald-400 shadow-inner" 
                                        dir="ltr" 
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SUMMARY EVALUATION */}
                    {selectedSection.type === 'summary_evaluation' && (
                        <div className="space-y-8">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת הערכה מסכמת</label>
                            
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400">טקסט סיכום (Briefing)</label>
                                <textarea 
                                    value={(selectedSection as SummaryEvaluationSection).briefingText} 
                                    onChange={e => updateSection(selectedId!, { briefingText: e.target.value })} 
                                    className="w-full p-4 border-2 border-slate-100 rounded-3xl font-black italic text-lg bg-slate-50 focus:bg-white transition-all shadow-inner h-40"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">ציון (1-5)</label>
                                    <input type="number" min="1" max="5" value={(selectedSection as SummaryEvaluationSection).score} onChange={e => updateSection(selectedId!, { score: parseInt(e.target.value) })} className="w-full p-3 border rounded-xl font-bold text-center text-rose-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400">תווית סטטוס</label>
                                    <input type="text" value={(selectedSection as SummaryEvaluationSection).scoreLabel} onChange={e => updateSection(selectedId!, { scoreLabel: e.target.value })} className="w-full p-3 border rounded-xl font-bold" />
                                </div>
                            </div>

                            {/* Deficiencies Manager */}
                            <div className="space-y-4 pt-4 border-t">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest block mb-2">ליקויים עיקריים</label>
                                <div className="space-y-2">
                                    {(selectedSection as SummaryEvaluationSection).deficiencies.map((def, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input type="text" value={def} onChange={e => {
                                                const newDefs = [...(selectedSection as SummaryEvaluationSection).deficiencies];
                                                newDefs[idx] = e.target.value;
                                                updateSection(selectedId!, { deficiencies: newDefs });
                                            }} className="flex-1 p-3 border rounded-xl font-bold text-xs bg-rose-50/20" />
                                            <button onClick={() => updateSection(selectedId!, { deficiencies: (selectedSection as SummaryEvaluationSection).deficiencies.filter((_, i) => i !== idx) })} className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center font-bold">✕</button>
                                        </div>
                                    ))}
                                    <button onClick={() => updateSection(selectedId!, { deficiencies: [...(selectedSection as SummaryEvaluationSection).deficiencies, ''] })} className="w-full py-3 border-2 border-dashed border-rose-200 text-rose-500 rounded-xl font-black text-xs hover:bg-rose-50 transition-colors">+ הוסף ליקוי חדש</button>
                                </div>
                            </div>

                            {/* Recommendations Manager */}
                            <div className="space-y-4 pt-4 border-t">
                                <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block mb-2">המלצות הביקורת</label>
                                <div className="space-y-2">
                                    {(selectedSection as SummaryEvaluationSection).recommendations.map((rec, idx) => (
                                        <div key={idx} className="flex gap-2">
                                            <input type="text" value={rec} onChange={e => {
                                                const newRecs = [...(selectedSection as SummaryEvaluationSection).recommendations];
                                                newRecs[idx] = e.target.value;
                                                updateSection(selectedId!, { recommendations: newRecs });
                                            }} className="flex-1 p-3 border rounded-xl font-bold text-xs bg-emerald-50/20" />
                                            <button onClick={() => updateSection(selectedId!, { recommendations: (selectedSection as SummaryEvaluationSection).recommendations.filter((_, i) => i !== idx) })} className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-xl hover:bg-emerald-500 hover:text-white transition-colors flex items-center justify-center font-bold">✕</button>
                                        </div>
                                    ))}
                                    <button onClick={() => updateSection(selectedId!, { recommendations: [...(selectedSection as SummaryEvaluationSection).recommendations, ''] })} className="w-full py-3 border-2 border-dashed border-emerald-200 text-emerald-500 rounded-xl font-black text-xs hover:bg-emerald-50 transition-colors">+ הוסף המלצה חדשה</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KPI EDITOR */}
                    {selectedSection.type === 'kpi' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת מדדי KPI</label>
                            <div className="space-y-4">
                                {(selectedSection as KPISection).metrics.map((m, idx) => (
                                    <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 space-y-4 relative shadow-inner">
                                        <button 
                                          onClick={() => {
                                            const newMetrics = (selectedSection as KPISection).metrics.filter((_, i) => i !== idx);
                                            updateSection(selectedId!, { metrics: newMetrics });
                                          }}
                                          className="absolute top-4 left-4 text-rose-500 text-xs font-black"
                                        >מחק</button>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400">שם המדד</label>
                                            <input type="text" value={m.label} onChange={e => {
                                                const metrics = [...(selectedSection as KPISection).metrics];
                                                metrics[idx].label = e.target.value;
                                                updateSection(selectedId!, { metrics });
                                            }} className="w-full p-3 border rounded-xl font-bold text-sm" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" value={m.value} onChange={e => {
                                                const metrics = [...(selectedSection as KPISection).metrics];
                                                metrics[idx].value = e.target.value;
                                                updateSection(selectedId!, { metrics });
                                            }} className="p-3 border rounded-xl font-bold text-sm text-indigo-600" placeholder="ערך" />
                                            <input type="text" value={m.delta || ''} onChange={e => {
                                                const metrics = [...(selectedSection as KPISection).metrics];
                                                metrics[idx].delta = e.target.value;
                                                updateSection(selectedId!, { metrics });
                                            }} className="p-3 border rounded-xl font-bold text-sm text-emerald-600" placeholder="שינוי %" />
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

                    {/* DATE PICKER EDITOR */}
                    {selectedSection.type === 'date_picker' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">עריכת תאריכון</label>
                            <input type="text" value={(selectedSection as DatePickerSection).label} onChange={e => updateSection(selectedId!, { label: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" placeholder="תווית..." />
                            <input type="date" value={(selectedSection as DatePickerSection).date} onChange={e => updateSection(selectedId!, { date: e.target.value })} className="w-full p-6 border-4 border-indigo-100 rounded-[2.5rem] font-black text-2xl text-center text-indigo-600 focus:border-indigo-500 outline-none transition-all" />
                        </div>
                    )}

                    {/* GRAPHIC EDITOR */}
                    {selectedSection.type === 'pasted_graphic' && (
                        <div className="space-y-6">
                            <label className="text-xs font-black text-indigo-600 block border-b pb-2 uppercase tracking-widest">תמונה / גרפיקה</label>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-56 border-4 border-dashed border-slate-200 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all group relative overflow-hidden"
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) handleImageUpload(file);
                                }} />
                                <span className="text-5xl mb-3">🖼️</span>
                                <p className="text-sm font-black text-slate-500">לחץ להעלאה או הדבק Ctrl+V</p>
                            </div>
                            <input 
                                type="text" 
                                value={(selectedSection as PastedGraphicSection).caption || ''} 
                                onChange={e => updateSection(selectedId!, { caption: e.target.value })} 
                                className="w-full p-4 border rounded-2xl font-bold text-xs" 
                                placeholder="הוסף תיאור לתמונה (Caption)..."
                            />
                        </div>
                    )}

                    <button 
                        onClick={() => { 
                            if(confirm('למחוק לצמיתות את האובייקט מהדו"ח?')) { 
                                if (!report) return;
                                onUpdate({...report, sections: sections.filter((s: any) => s.id !== selectedId)}); 
                                onSelect(null); 
                            } 
                        }} 
                        className="w-full py-6 bg-rose-50 text-rose-600 font-black rounded-[2.5rem] border-2 border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-md mt-10"
                    >מחיקת אובייקט מהדו"ח ✕</button>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
