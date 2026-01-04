
import React, { useState, useEffect } from 'react';
import { Section, SectionType, Report, DataChartSection, TableSection, KPISection, SectionStyles, KPIMetric, PastedGraphicSection, SummaryEvaluationSection } from '../types';

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
  { type: 'summary_evaluation' as SectionType, label: 'הערכה מסכמת', icon: '⚖️' },
  { type: 'data_chart' as SectionType, label: 'גרף נתונים', icon: '📊' },
  { type: 'table' as SectionType, label: 'טבלת נתונים', icon: '📅' },
  { type: 'pasted_graphic' as SectionType, label: 'תמונה / גרפיקה', icon: '🖼️' },
];

export const EditorPanel: React.FC<EditorPanelProps> = ({ report, onUpdate, selectedId, onSelect, onMove, onCloseSidebar }) => {
  const [pasteBuffer, setPasteBuffer] = useState('');

  const updateSection = (id: string, updates: Partial<Section>) => {
    onUpdate({ 
      ...report, 
      sections: report.sections.map(s => s.id === id ? { ...s, ...updates } as any : s) 
    });
  };

  const selectedSection = report.sections.find(s => s.id === selectedId);

  // פונקציות עזר לרשימות הדינמיות
  const handleAddListItem = (id: string, field: 'recommendations' | 'deficiencies') => {
    const section = report.sections.find(s => s.id === id) as SummaryEvaluationSection;
    if (!section) return;
    const newList = [...section[field], "סעיף חדש..."];
    updateSection(id, { [field]: newList });
  };

  const handleUpdateListItem = (id: string, field: 'recommendations' | 'deficiencies', index: number, value: string) => {
    const section = report.sections.find(s => s.id === id) as SummaryEvaluationSection;
    if (!section) return;
    const newList = [...section[field]];
    newList[index] = value;
    updateSection(id, { [field]: newList });
  };

  const handleRemoveListItem = (id: string, field: 'recommendations' | 'deficiencies', index: number) => {
    const section = report.sections.find(s => s.id === id) as SummaryEvaluationSection;
    if (!section) return;
    const newList = section[field].filter((_, i) => i !== index);
    updateSection(id, { [field]: newList });
  };

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
                <span className="text-[12px] text-slate-400 font-bold uppercase tracking-widest mt-1">{sec.type}</span>
              </div>
            </div>
          </button>
        ))}
        
        <div className="grid grid-cols-2 gap-4 pt-6">
          {SECTION_OPTIONS.map(opt => (
            <button 
              key={opt.type} 
              onClick={() => {
                const id = `sec-${Date.now()}`;
                const newSec = { 
                  id, type: opt.type, title: opt.label, styles: { colSpan: 12, height: 800, fontScale: 1, dataFontScale: 1, labelFontScale: 1, alignment: 'right' },
                  ...(opt.type === 'summary_evaluation' ? { briefingText: 'ממצאי הביקורת מעלים תמונה מורכבת...', score: 4, scoreLabel: 'טעון שיפור', recommendations: ['הטמעת כלי התאמות אוטומטי'], deficiencies: ['חוסר התאמה מתמשך בין יתרות'] } : {}),
                  ...(opt.type === 'text' ? { content: 'הזן טקסט כאן...' } : {}),
                  ...(opt.type === 'kpi' ? { metrics: [{ label: 'מדד לדוגמה', value: '1,200', delta: '+5%', trend: 'up' }] } : {}),
                  ...(opt.type === 'table' ? { headers: ['כותרת 1', 'כותרת 2'], rows: [['נתון 1', 'נתון 2']] } : {}),
                  ...(opt.type === 'data_chart' ? { chartKind: 'bar', data: [{ x: 'א', y: 10 }, { x: 'ב', y: 20 }], seriesKeys: ['y'], xKey: 'x' } : {}),
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
        <div className="h-[85%] border-t border-slate-200 bg-white p-10 overflow-y-auto shadow-[0_-25px_50px_-12px_rgba(0,0,0,0.15)] z-50 custom-scrollbar">
          <h3 className="text-2xl font-extrabold text-[#002d72] mb-10">הגדרות אובייקט</h3>

          <div className="space-y-10">
            {selectedSection.type === 'summary_evaluation' && (
                <div className="space-y-10">
                    <div>
                        <label className="text-sm font-bold text-slate-400 mb-2 block uppercase tracking-widest">טקסט סקירה (Briefing)</label>
                        <textarea 
                            value={(selectedSection as SummaryEvaluationSection).briefingText}
                            onChange={e => updateSection(selectedId!, { briefingText: e.target.value })}
                            className="w-full h-40 p-5 bg-slate-50 border rounded-[1.5rem] font-bold text-lg outline-none focus:border-[#002d72] resize-none"
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="text-sm font-bold text-slate-400 mb-2 block uppercase tracking-widest">ציון (1-5)</label>
                            <input 
                                type="number" min="1" max="5"
                                value={(selectedSection as SummaryEvaluationSection).score}
                                onChange={e => updateSection(selectedId!, { score: parseInt(e.target.value) })}
                                className="w-full p-5 bg-slate-50 border rounded-[1.5rem] font-black text-4xl text-rose-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-slate-400 mb-2 block uppercase tracking-widest">תווית ציון</label>
                            <input 
                                type="text"
                                value={(selectedSection as SummaryEvaluationSection).scoreLabel}
                                onChange={e => updateSection(selectedId!, { scoreLabel: e.target.value })}
                                className="w-full p-5 bg-slate-50 border rounded-[1.5rem] font-bold outline-none"
                            />
                        </div>
                    </div>

                    {/* ממשק המלצות דינמי */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">המלצות הביקורת</label>
                            <button 
                                onClick={() => handleAddListItem(selectedId!, 'recommendations')}
                                className="text-[10px] bg-emerald-500 text-white px-3 py-1 rounded-full font-black hover:bg-emerald-600 transition-all"
                            >+ הוסף סעיף</button>
                        </div>
                        <div className="space-y-3">
                            {(selectedSection as SummaryEvaluationSection).recommendations.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={item}
                                        onChange={e => handleUpdateListItem(selectedId!, 'recommendations', idx, e.target.value)}
                                        className="flex-1 p-3 bg-emerald-50 border border-emerald-100 rounded-xl font-bold text-sm outline-none"
                                    />
                                    <button 
                                        onClick={() => handleRemoveListItem(selectedId!, 'recommendations', idx)}
                                        className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ממשק ליקויים דינמי */}
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className="text-sm font-bold text-slate-400 uppercase tracking-widest">ליקויים עיקריים</label>
                            <button 
                                onClick={() => handleAddListItem(selectedId!, 'deficiencies')}
                                className="text-[10px] bg-rose-500 text-white px-3 py-1 rounded-full font-black hover:bg-rose-600 transition-all"
                            >+ הוסף סעיף</button>
                        </div>
                        <div className="space-y-3">
                            {(selectedSection as SummaryEvaluationSection).deficiencies.map((item, idx) => (
                                <div key={idx} className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={item}
                                        onChange={e => handleUpdateListItem(selectedId!, 'deficiencies', idx, e.target.value)}
                                        className="flex-1 p-3 bg-rose-50 border border-rose-100 rounded-xl font-bold text-sm outline-none"
                                    />
                                    <button 
                                        onClick={() => handleRemoveListItem(selectedId!, 'deficiencies', idx)}
                                        className="w-10 h-10 bg-rose-100 text-rose-500 rounded-xl font-bold hover:bg-rose-500 hover:text-white transition-all"
                                    >✕</button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <button 
                onClick={() => { if(confirm('למחוק את האובייקט?')) { onUpdate({...report, sections: report.sections.filter(s => s.id !== selectedId)}); onSelect(null); } }} 
                className="w-full py-6 bg-rose-50 text-rose-600 font-extrabold rounded-[1.5rem] hover:bg-rose-600 hover:text-white transition-all"
            >
                ✕ מחק אובייקט
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
