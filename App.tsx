
import React, { useState, useRef, useEffect } from 'react';
import { Report } from './types';
import { INITIAL_REPORT } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

// מפתחות לשמירה מקומית עבור כל מודול
const REPORT_STORAGE_KEY = 'offline_report_data';
const APP2_STORAGE_KEY = 'offline_app2_data';

// סוגי המודולים הזמינים
type ModuleType = 'reports' | 'app2';

const App: React.FC = () => {
  const [activeModule, setActiveModule] = useState<ModuleType>('reports');
  
  // --- לוגיקה עבור מודול הדוחות ---
  const [report, setReport] = useState<Report>(() => {
    const saved = localStorage.getItem(REPORT_STORAGE_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return INITIAL_REPORT; }
    }
    return INITIAL_REPORT;
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [editMode, setEditMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');

  // שמירה אוטומטית של דוחות
  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify(report));
      setSaveStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);

  // --- תצוגת מודול הדוחות ---
  const renderReportBuilder = () => (
    <div className="flex flex-1 min-w-0 overflow-hidden">
        {/* סרגל עריכה צדי */}
        <div className={`${(isSidebarOpen && editMode) ? 'w-[450px]' : 'w-0'} transition-all duration-500 border-l bg-white shadow-2xl flex flex-col overflow-hidden shrink-0 no-print`}>
            <EditorPanel 
            report={report} 
            onUpdate={setReport} 
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMove={() => {}} 
            onCloseSidebar={() => setIsSidebarOpen(false)}
            />
        </div>

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${editMode ? 'p-8' : 'p-16'}`}>
            <div className="max-w-[1400px] mx-auto grid grid-cols-12 gap-8 pb-32">
            {report.sections.length === 0 ? (
                <div className="col-span-12 h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-2-5rem text-slate-300 bg-white/50 border-slate-200">
                <span className="text-5xl mb-4">📄</span>
                <p className="text-lg font-bold">הדו"ח ריק</p>
                </div>
            ) : (
                report.sections.map((section) => (
                <div 
                    key={section.id} 
                    className="transition-all"
                    style={{ gridColumn: `span ${section.styles?.colSpan || 12}` }}
                >
                    <SectionPreview 
                    section={section} 
                    isSelected={editMode && selectedId === section.id}
                    onDelete={editMode ? (id) => setReport(p => ({...p, sections: p.sections.filter(s => s.id !== id)})) : undefined as any} 
                    onSelect={editMode ? setSelectedId : undefined as any}
                    />
                </div>
                ))
            )}
            </div>
        </main>
    </div>
  );

  // --- תצוגת מודול Placeholder (כאן תבוא האפליקציה השנייה) ---
  const renderApp2 = () => (
    <div className="flex-1 flex flex-col items-center justify-center bg-white p-20 text-center">
        <div className="bg-slate-50 p-16 rounded-2-5rem border-4 border-dashed border-slate-200 max-w-2xl">
            <span className="text-8xl mb-8 block">🚀</span>
            <h2 className="text-4xl font-extrabold text-[#002d72] mb-4">כאן תופיע האפליקציה השנייה</h2>
            <p className="text-xl text-slate-500 leading-relaxed">
                התשתית המאוחדת מוכנה! <br/>
                פשוט הדבק את הקוד של האפליקציה השנייה בתוך הפונקציה <code>renderApp2</code> בקובץ <code>App.tsx</code>.
            </p>
            <button className="mt-8 px-10 py-4 bg-[#002d72] text-white rounded-2xl font-bold shadow-xl hover:scale-105 transition-all">
                לחץ כאן להפעלת לוגיקה ייחודית
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden" dir="rtl">
      
      {/* סרגל ניווט אפליקציות (Global Sidebar) */}
      <nav className="w-20 bg-[#001b44] flex flex-col items-center py-8 gap-6 shrink-0 no-print shadow-2xl z-[60]">
        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white font-bold text-xl mb-4">Ω</div>
        
        <button 
            onClick={() => setActiveModule('reports')}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${activeModule === 'reports' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
            title="בונה דוחות"
        >
            <span className="text-2xl">📊</span>
            <span className="text-[9px] font-bold">דוחות</span>
        </button>

        <button 
            onClick={() => setActiveModule('app2')}
            className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${activeModule === 'app2' ? 'bg-blue-500 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5'}`}
            title="אפליקציה 2"
        >
            <span className="text-2xl">⚙️</span>
            <span className="text-[9px] font-bold">הגדרות</span>
        </button>

        <div className="mt-auto flex flex-col items-center gap-4">
            <div className={`w-3 h-3 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} title={saveStatus === 'saved' ? 'הכל שמור' : 'שומר...'}></div>
            <span className="text-white/20 text-[10px] font-bold">V1.0</span>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header משותף */}
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 sticky top-0 shadow-sm no-print">
          <div className="flex items-center gap-6">
            <h1 className="font-bold text-[#002d72] text-xl tracking-tight">
                {activeModule === 'reports' ? 'מערכת דוחות פנימית' : 'מרכז ניהול - אפליקציה 2'}
            </h1>
            
            {activeModule === 'reports' && editMode && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${isSidebarOpen ? 'bg-slate-100 text-[#002d72]' : 'bg-white'}`}
              >
                {isSidebarOpen ? 'סגור מעצב' : 'פתח מעצב'}
              </button>
            )}
          </div>

          {activeModule === 'reports' && (
            <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-2xl shadow-inner">
                <button 
                    onClick={() => { setEditMode(false); setSelectedId(null); }}
                    className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${!editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500'}`}
                >תצוגה</button>
                <button 
                    onClick={() => setEditMode(true)}
                    className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500'}`}
                >עריכה</button>
            </div>
          )}

          <div className="flex gap-2">
            <button className="px-6 py-2 bg-[#002d72] text-white rounded-xl text-[11px] font-bold shadow-xl hover:bg-blue-600 transition-all">ייצוא נתונים</button>
          </div>
        </header>

        {/* תוכן המודול הפעיל */}
        <div className="flex-1 flex overflow-hidden">
            {activeModule === 'reports' ? renderReportBuilder() : renderApp2()}
        </div>
      </div>
    </div>
  );
};

export default App;
