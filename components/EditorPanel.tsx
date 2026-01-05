
import React, { useState, useEffect, useRef } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, KPIMetric, SummaryEvaluationSection, DatePickerSection, AnomalySection, AnomalyItem, TextSection } from '../types';

interface EditorPanelProps {
  report: Report;
  activeTabIndex: number;
  onSetActiveTab: (index: number) => void;
  onAddTab: () => void;
  onDeleteTab: (index: number) => void;
  onUpdate: (report: Report) => void;
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
  { type: 'table' as SectionType, label: 'טבלת נתונים', icon: '📅' },
  { type: 'pasted_graphic' as SectionType, label: 'תמונה / גרפיקה', icon: '🖼️' },
];

const PRESET_ICONS = ["📊", "📈", "🎯", "📝", "📁", "📅", "⚖️", "🔍", "🌍", "💼", "🏢", "👥", "⚙️", "💰"];

const CHART_KINDS = [
  { id: 'bar', label: 'עמודות', icon: '📊' },
  { id: 'line', label: 'קווי', icon: '📈' },
  { id: 'pie', label: 'עוגה', icon: '🍕' },
  { id: 'donut', label: 'דונאט', icon: '🍩' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ 
  report, 
  activeTabIndex,
  onSetActiveTab,
  onAddTab,
  onDeleteTab,
  onUpdate, 
  selectedId, 
  onSelect, 
  onMove, 
  onCloseSidebar 
}) => {
  const [pasteBuffer, setPasteBuffer] = useState('');
  const [tabsExpanded, setTabsExpanded] = useState(true);
  const iconInputRef = useRef<HTMLInputElement>(null);
  
  const activeTab = report.tabs[activeTabIndex];
  const sections = activeTab.sections || [];

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
    const newTabs = [...report.tabs];
    newTabs[activeTabIndex] = {
        ...newTabs[activeTabIndex],
        sections: newTabs[activeTabIndex].sections.map(s => s.id === id ? { ...s, ...updates } as Section : s)
    };
    onUpdate({ ...report, tabs: newTabs });
  };

  const updateTabMetadata = (tabIndex: number, updates: any) => {
    const newTabs = [...report.tabs];
    newTabs[tabIndex] = { ...newTabs[tabIndex], ...updates };
    onUpdate({ ...report, tabs: newTabs });
  };

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        updateTabMetadata(activeTabIndex, { icon: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateStyles = (id: string, styleUpdates: Partial<SectionStyles>) => {
    updateSection(id, { styles: { ...(sections.find(s => s.id === id)?.styles || {}), ...styleUpdates } });
  };

  const updateKPIMetric = (sectionId: string, metricIndex: number, updates: Partial<KPIMetric>) => {
    const section = sections.find(s => s.id === sectionId) as KPISection;
    if (!section || section.type !== 'kpi') return;
    const newMetrics = [...section.metrics];
    newMetrics[metricIndex] = { ...newMetrics[metricIndex], ...updates };
    updateSection(sectionId, { metrics: newMetrics });
  };

  const handleDataPaste = (text: string, sectionId: string) => {
    const section = sections.find(s => s.id === sectionId);
    if (!text || !text.trim() || !section) return;
    
    const lines = text.trim().split(/\r?\n/).map(l => l.split(/\t|,/).map(cell => cell.trim()));
    if (lines.length === 0) return;

    if (section.type === 'table') {
      updateSection(sectionId, { headers: lines[0] || [], rows: lines.slice(1) || [] } as any);
    } else if (section.type === 'data_chart') {
      const firstRow = lines[0];
      const isLikelyData = (val: string) => !isNaN(parseFloat(val?.replace(/[^\d.-]/g, '')));
      const hasHeader = firstRow.slice(1).some(cell => !isLikelyData(cell));
      
      let xKey = hasHeader ? firstRow[0] || 'x' : 'x';
      let seriesKeys = hasHeader ? firstRow.slice(1) : firstRow.slice(1).map((_, i) => `Series ${i+1}`);
      let dataRows = hasHeader ? lines.slice(1) : lines;
      
      const parsedData = dataRows.map(row => {
        const obj: Record<string, any> = { [xKey]: row[0] || '' };
        seriesKeys.forEach((key, i) => {
          const valString = (row[i + 1] || '0').replace(/[^\d.-]/g, '');
          const val = parseFloat(valString);
          obj[key] = isNaN(val) ? 0 : val;
        });
        return obj;
      }).filter(item => item[xKey] !== '');

      updateSection(sectionId, { data: parsedData, xKey, seriesKeys } as any);
    }
  };

  const selectedSection = sections.find(s => s.id === selectedId);

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200" dir="rtl">
      <div className="p-8 bg-[#0f172a] text-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">מעצב הדו"ח</h2>
          <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest mt-1">Professional Data Visualizer</p>
        </div>
        <button onClick={onCloseSidebar} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 custom-scrollbar">
        
        {/* Tab Management Accordion */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <button 
                onClick={() => setTabsExpanded(!tabsExpanded)}
                className="w-full p-4 flex items-center justify-between bg-slate-50 border-b hover:bg-slate-100 transition-all"
            >
                <div className="flex items-center gap-2">
                    <span className="text-indigo-600 text-lg">📂</span>
                    <span className="font-black text-xs uppercase tracking-widest text-slate-700">ניהול דפים (טאבים)</span>
                </div>
                <span className={`text-slate-400 transition-transform ${tabsExpanded ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {tabsExpanded && (
                <div className="p-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                    {report.tabs.map((tab, idx) => (
                        <div key={idx} className="flex gap-1 group">
                            <button 
                                onClick={() => onSetActiveTab(idx)}
                                className={`flex-1 p-3 rounded-xl border text-right transition-all flex items-center gap-3 ${
                                    activeTabIndex === idx 
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md ring-2 ring-indigo-200' 
                                    : 'bg-white border-slate-100 hover:border-indigo-200 text-slate-600'
                                }`}
                            >
                                <span className="text-lg">{tab.icon && !tab.icon.startsWith('data') ? tab.icon : '📄'}</span>
                                <span className="font-bold text-xs truncate flex-1">{tab.title}</span>
                            </button>
                            {report.tabs.length > 1 && (
                                <button 
                                    onClick={() => onDeleteTab(idx)}
                                    className="px-3 bg-rose-50 text-rose-400 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100"
                                >✕</button>
                            )}
                        </div>
                    ))}
                    <button 
                        onClick={onAddTab}
                        className="w-full p-3 border-2 border-dashed border-indigo-100 rounded-xl text-indigo-500 font-bold text-xs hover:border-indigo-300 hover:bg-indigo-50 transition-all mt-2"
                    >
                        + הוסף דף חדש
                    </button>

                    <div className="pt-4 mt-2 border-t border-slate-100 space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[10px] font-bold text-slate-400">גודל טקסט טאבים</span>
                            <span className="text-xs font-black text-indigo-600">{report.tabFontSize || 10}px</span>
                        </div>
                        <input 
                            type="range" min="8" max="24" step="1" 
                            value={report.tabFontSize || 10} 
                            onChange={e => onUpdate({ ...report, tabFontSize: parseInt(e.target.value) })}
                            className="w-full accent-indigo-600 h-1"
                        />
                    </div>
                </div>
            )}
        </div>

        <div className="h-px bg-slate-200 my-4 mx-2"></div>

        {/* Current Tab Metadata Trigger */}
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">הגדרות הדף הנוכחי</p>
        <button 
          onClick={() => onSelect('tab-settings')}
          className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${
            selectedId === 'tab-settings' ? 'border-indigo-500 bg-white shadow-lg' : 'border-indigo-100 bg-indigo-50/20 hover:border-indigo-200 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center bg-indigo-100 rounded-lg text-xl overflow-hidden">
               {activeTab.icon?.startsWith('data:image') ? (
                   <img src={activeTab.icon} className="w-full h-full object-cover" alt="" />
               ) : (
                   <span>{activeTab.icon || '📁'}</span>
               )}
            </div>
            <div className="flex flex-col text-right">
              <span className={`font-bold text-sm ${selectedId === 'tab-settings' ? 'text-indigo-700' : 'text-slate-700'}`}>{activeTab.title}</span>
              <span className="text-[10px] text-slate-400">ערוך כותרות ואייקון</span>
            </div>
          </div>
        </button>

        <div className="h-px bg-slate-200 my-4 mx-2"></div>

        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2 mb-2">רכיבים בטאב</p>
        {sections.map((sec: any) => (
          <button 
            key={sec.id} 
            onClick={() => onSelect(sec.id)}
            className={`w-full p-4 rounded-2xl border-2 text-right transition-all flex items-center justify-between ${
              selectedId === sec.id ? 'border-indigo-600 bg-white shadow-lg' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl opacity-50">{SECTION_OPTIONS.find(o => o.type === sec.type)?.icon}</span>
              <div className="flex flex-col text-right">
                <span className={`font-bold text-sm ${selectedId === sec.id ? 'text-indigo-600' : 'text-slate-700'}`}>{sec.title || 'ללא כותרת'}</span>
                <span className="text-[10px] text-slate-400">{sec.styles?.colSpan || 12}/12 | גובה: {sec.styles?.height || '400'}px</span>
              </div>
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
                  ...(opt.type === 'summary_evaluation' ? { briefingText: 'הזן סיכום...', score: 4, scoreLabel: 'תקין', footerLabel: 'COMPLIANCE MAGNITUDE VERIFIED', recommendations: ['המלצה 1'], deficiencies: ['ליקוי 1'] } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד חדש', value: '0', delta: '+0%', trend: 'up' }] } : {}),
                  ...(opt.type === 'date_picker' ? { date: new Date().toISOString().split('T')[0], label: 'תאריך הדו"ח' } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [{x: 'א', y: 10}], xKey: 'x', seriesKeys: ['y'] } : {}),
                  ...(opt.type === 'table' ? { headers: ['כותרת'], rows: [['נתון']] } : {}),
                  ...(opt.type === 'text' ? { content: 'תוכן טקסט...' } : {})
                };
                const newTabs = [...report.tabs];
                newTabs[activeTabIndex] = { ...newTabs[activeTabIndex], sections: [...sections, newSec as Section] };
                onUpdate({ ...report, tabs: newTabs });
                onSelect(id);
            }} className="flex flex-col items-center gap-2 p-4 bg-white border border-slate-100 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all text-xs font-bold shadow-sm">
              <span className="text-2xl">{opt.icon}</span> {opt.label}
            </button>
          ))}
        </div>
      </div>

      {(selectedSection || selectedId === 'tab-settings') && (
        <div className="h-[75%] border-t bg-white p-8 overflow-y-auto shadow-2xl z-50 custom-scrollbar animate-in slide-in-from-bottom duration-300 text-right">
          <div className="flex justify-between items-center mb-8 border-b pb-6">
            <h3 className="text-xl font-black text-slate-900">{selectedId === 'tab-settings' ? 'הגדרות דף' : 'עריכת אובייקט'}</h3>
            <button onClick={() => onSelect(null)} className="text-slate-300 font-bold hover:text-slate-600">סגור ✕</button>
          </div>

          <div className="space-y-10">
            {selectedId === 'tab-settings' ? (
              <div className="space-y-8">
                <div className="bg-slate-50 p-6 rounded-[2rem] space-y-6">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">תצוגת הטאב</p>
                   
                   <div className="space-y-3">
                      <label className="text-[11px] font-bold text-slate-600">בחירת אייקון</label>
                      <div className="grid grid-cols-7 gap-2 mb-4">
                        {PRESET_ICONS.map(ic => (
                          <button 
                            key={ic}
                            onClick={() => updateTabMetadata(activeTabIndex, { icon: ic })}
                            className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all ${activeTab.icon === ic ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border hover:bg-slate-50'}`}
                          >
                            {ic}
                          </button>
                        ))}
                      </div>
                      <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleIconUpload} />
                      <button 
                        onClick={() => iconInputRef.current?.click()}
                        className="w-full py-3 bg-white border-2 border-dashed border-slate-200 rounded-2xl text-xs font-bold text-slate-500 hover:border-indigo-400 hover:text-indigo-600 transition-all"
                      >
                         📂 העלה תמונה מתיקייה
                      </button>
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-600">שם הטאב</label>
                      <input 
                        type="text" 
                        value={activeTab.title || ''} 
                        onChange={e => updateTabMetadata(activeTabIndex, { title: e.target.value })} 
                        className="w-full p-4 border-2 rounded-2xl font-bold bg-white focus:border-indigo-500 outline-none transition-all" 
                        placeholder="למשל: תקציר מנהלים"
                      />
                   </div>

                   <div className="space-y-2">
                      <label className="text-[11px] font-bold text-slate-600">כותרת משנה</label>
                      <input 
                        type="text" 
                        value={activeTab.subTitles || ''} 
                        onChange={e => updateTabMetadata(activeTabIndex, { subTitles: e.target.value })} 
                        className="w-full p-4 border-2 rounded-2xl font-bold bg-white focus:border-indigo-500 outline-none transition-all" 
                        placeholder="תיאור קצר של תוכן הטאב..."
                      />
                   </div>
                </div>
              </div>
            ) : selectedSection && (
              <>
                {/* Section Specific Controls */}
                <div className="bg-[#f0f7ff] p-6 rounded-3xl space-y-6">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest border-b border-indigo-100 pb-2">קנה מידה ופונטים</p>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-bold"><span>פונט צירים ומקרא</span><span>{selectedSection.styles?.labelFontScale}x</span></div>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={selectedSection.styles?.labelFontScale || 1} onChange={e => updateStyles(selectedId!, { labelFontScale: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-bold"><span>פונט ערכים פנימיים</span><span>{selectedSection.styles?.dataFontScale}x</span></div>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={selectedSection.styles?.dataFontScale || 1} onChange={e => updateStyles(selectedId!, { dataFontScale: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-[11px] font-bold"><span>פונט כותרות</span><span>{selectedSection.styles?.fontScale}x</span></div>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={selectedSection.styles?.fontScale || 1} onChange={e => updateStyles(selectedId!, { fontScale: parseFloat(e.target.value) })} className="w-full accent-indigo-600" />
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl space-y-6">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">פריסה</p>
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <span className="text-[10px] font-bold">רוחב (עמודות)</span>
                      <input type="number" min="1" max="12" value={selectedSection.styles?.colSpan || 12} onChange={e => updateStyles(selectedId!, { colSpan: parseInt(e.target.value) })} className="w-full p-2 border rounded-xl" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <span className="text-[10px] font-bold">גובה (px)</span>
                      <input type="number" min="100" max="2000" value={selectedSection.styles?.height || 400} onChange={e => updateStyles(selectedId!, { height: parseInt(e.target.value) })} className="w-full p-2 border rounded-xl" />
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedSection.type === 'data_chart' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">סוג תצוגה</label>
                        <div className="flex bg-slate-100 p-1 rounded-2xl gap-1">
                          {CHART_KINDS.map(k => (
                            <button 
                              key={k.id}
                              onClick={() => updateSection(selectedId!, { chartKind: k.id as any })}
                              className={`flex-1 flex flex-col items-center py-2 rounded-xl transition-all ${
                                (selectedSection as DataChartSection).chartKind === k.id 
                                ? 'bg-white text-indigo-600 shadow-sm' 
                                : 'text-slate-400 hover:text-slate-600'
                              }`}
                            >
                              <span className="text-xl">{k.icon}</span>
                              <span className="text-[9px] font-bold mt-1">{k.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">כותרת הגרף</label>
                        <input type="text" value={selectedSection.title || ''} onChange={e => updateSection(selectedId!, { title: e.target.value })} className="w-full p-4 border rounded-2xl font-bold" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">נתונים (אקסל/CSV)</label>
                        <textarea 
                          value={pasteBuffer} 
                          onPaste={(e) => handleDataPaste(e.clipboardData.getData('text'), selectedId!)}
                          onChange={e => { setPasteBuffer(e.target.value); handleDataPaste(e.target.value, selectedId!); }}
                          placeholder="הדבק כאן טבלה..."
                          className="w-full h-48 p-4 font-mono text-[10px] border-2 rounded-2xl bg-slate-900 text-indigo-400 shadow-inner"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  )}

                  {selectedSection.type === 'kpi' && (
                    <div className="space-y-4">
                      <div className="flex justify-between border-b pb-2"><label className="text-xs font-black text-indigo-600 uppercase">מדדי KPI</label>
                      <button onClick={() => updateSection(selectedId!, { metrics: [...(selectedSection as KPISection).metrics, { label: 'חדש', value: '0', delta: '+0%' }] })} className="bg-indigo-600 text-white px-3 py-1 rounded text-xs">+ מדד</button></div>
                      {(selectedSection as KPISection).metrics.map((m, idx) => (
                        <div key={idx} className="p-4 border-2 rounded-2xl space-y-2 relative bg-white shadow-sm">
                          <button onClick={() => updateSection(selectedId!, { metrics: (selectedSection as KPISection).metrics.filter((_, i) => i !== idx) })} className="absolute top-2 left-2 text-rose-500">✕</button>
                          <input type="text" value={m.label} onChange={e => updateKPIMetric(selectedId!, idx, { label: e.target.value })} className="w-full font-bold border-b p-1 text-sm outline-none" placeholder="שם המדד" />
                          <div className="flex gap-2">
                            <input type="text" value={m.value} onChange={e => updateKPIMetric(selectedId!, idx, { value: e.target.value })} className="w-2/3 text-indigo-600 font-black p-1 text-xl" placeholder="ערך" />
                            <input type="text" value={m.delta || ''} onChange={e => updateKPIMetric(selectedId!, idx, { delta: e.target.value })} className="w-1/3 text-slate-400 font-bold text-xs text-center border-r" placeholder="+0% או -0%" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedSection.type === 'summary_evaluation' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">טקסט סיכום</label>
                        <textarea value={(selectedSection as SummaryEvaluationSection).briefingText} onChange={e => updateSection(selectedId!, { briefingText: e.target.value })} className="w-full h-32 p-4 border rounded-2xl font-bold bg-slate-50" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-black text-rose-500 uppercase">ציון (1-5)</label>
                          <input type="number" min="1" max="5" value={(selectedSection as SummaryEvaluationSection).score} onChange={e => updateSection(selectedId!, { score: parseInt(e.target.value) })} className="w-full p-3 border rounded-xl font-bold text-center" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-black text-rose-500 uppercase">תווית ציון</label>
                          <input type="text" value={(selectedSection as SummaryEvaluationSection).scoreLabel} onChange={e => updateSection(selectedId!, { scoreLabel: e.target.value })} className="w-full p-3 border rounded-xl font-bold" />
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <label className="text-xs font-black text-rose-500 uppercase">ליקויים</label>
                        <button onClick={() => updateSection(selectedId!, { deficiencies: [...(selectedSection as SummaryEvaluationSection).deficiencies, 'ליקוי חדש'] })} className="block w-full py-2 bg-rose-50 text-rose-600 rounded-xl font-bold text-xs mb-2 transition-all hover:bg-rose-100">הוסף ליקוי +</button>
                        {(selectedSection as SummaryEvaluationSection).deficiencies.map((d, i) => (
                          <div key={i} className="flex gap-2 group">
                            <input type="text" value={d} onChange={e => {
                              const newList = [...(selectedSection as SummaryEvaluationSection).deficiencies];
                              newList[i] = e.target.value;
                              updateSection(selectedId!, { deficiencies: newList });
                            }} className="flex-1 p-2 border rounded-lg text-sm bg-slate-50/50" />
                            <button onClick={() => updateSection(selectedId!, { deficiencies: (selectedSection as SummaryEvaluationSection).deficiencies.filter((_, idx) => idx !== i) })} className="text-rose-300 hover:text-rose-600 transition-colors px-1">✕</button>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-4 pt-4 border-t border-slate-100">
                        <label className="text-xs font-black text-emerald-600 uppercase">המלצות הביקורת</label>
                        <button onClick={() => updateSection(selectedId!, { recommendations: [...(selectedSection as SummaryEvaluationSection).recommendations, 'המלצה חדשה'] })} className="block w-full py-2 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-xs mb-2 transition-all hover:bg-emerald-100">הוסף המלצה +</button>
                        {(selectedSection as SummaryEvaluationSection).recommendations.map((r, i) => (
                          <div key={i} className="flex gap-2 group">
                            <input type="text" value={r} onChange={e => {
                              const newList = [...(selectedSection as SummaryEvaluationSection).recommendations];
                              newList[i] = e.target.value;
                              updateSection(selectedId!, { recommendations: newList });
                            }} className="flex-1 p-2 border rounded-lg text-sm bg-slate-50/50" />
                            <button onClick={() => updateSection(selectedId!, { recommendations: (selectedSection as SummaryEvaluationSection).recommendations.filter((_, idx) => idx !== i) })} className="text-rose-300 hover:text-rose-600 transition-colors px-1">✕</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedSection.type === 'date_picker' && (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">תווית התאריך</label>
                        <input 
                          type="text" 
                          value={(selectedSection as DatePickerSection).label} 
                          onChange={e => updateSection(selectedId!, { label: e.target.value })} 
                          className="w-full p-4 border-2 rounded-2xl font-bold bg-white focus:border-indigo-600 outline-none transition-all" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-black text-slate-400 uppercase">בחירת תאריך</label>
                        <div className="flex gap-2">
                          <input 
                            type="date" 
                            value={(selectedSection as DatePickerSection).date} 
                            onChange={e => updateSection(selectedId!, { date: e.target.value })} 
                            className="flex-1 p-4 border-2 rounded-2xl font-bold bg-white focus:border-indigo-600 outline-none transition-all" 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedSection.type === 'text' && (
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase">תוכן הטקסט</label>
                      <textarea value={(selectedSection as TextSection).content} onChange={e => updateSection(selectedId!, { content: e.target.value })} className="w-full h-48 p-4 border rounded-2xl font-bold" />
                    </div>
                  )}
                </div>

                <button onClick={() => { if(confirm('למחוק לצמיתות?')) { 
                    const newTabs = [...report.tabs];
                    newTabs[activeTabIndex] = { ...newTabs[activeTabIndex], sections: sections.filter(s => s.id !== selectedId) };
                    onUpdate({...report, tabs: newTabs}); 
                    onSelect(null); 
                } }} className="w-full py-6 bg-rose-50 text-rose-600 font-black rounded-3xl border-2 border-rose-100 hover:bg-rose-600 hover:text-white transition-all shadow-sm">מחיקה סופית ✕</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
