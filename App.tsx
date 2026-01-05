
import React, { useState, useRef, useEffect } from 'react';
import { Report, Section, ReportTab } from './types';
import { INITIAL_REPORT } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

const STORAGE_KEY = 'offline_report_data_v4';

const App: React.FC = () => {
  const [report, setReport] = useState<Report>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tabs) return parsed;
        return { ...INITIAL_REPORT, tabs: [{ title: 'ראשי', icon: '📄', sections: parsed.sections || [] }] };
      } catch (e) {
        return INITIAL_REPORT;
      }
    }
    return INITIAL_REPORT;
  });

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSaveStatus('saving');
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
      setSaveStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);

  const activeTab = report.tabs[activeTabIndex] || report.tabs[0];

  const handleUpdateReport = (updatedReport: Report) => {
    setReport(updatedReport);
  };

  const handleUpdateActiveTabSections = (newSections: Section[]) => {
    setReport(prev => ({
      ...prev,
      tabs: prev.tabs.map((tab, idx) => idx === activeTabIndex ? { ...tab, sections: newSections } : tab)
    }));
  };

  const handleAddTab = () => {
    const newTab: ReportTab = {
      title: `טאב חדש ${report.tabs.length + 1}`,
      icon: "📁",
      sections: []
    };
    setReport(prev => ({ ...prev, tabs: [...prev.tabs, newTab] }));
    setActiveTabIndex(report.tabs.length);
  };

  const handleDeleteTab = (index: number) => {
    if (report.tabs.length <= 1) return;
    if (confirm('למחוק את הטאב וכל תכולתו?')) {
        const newTabs = report.tabs.filter((_, i) => i !== index);
        setReport(prev => ({ ...prev, tabs: newTabs }));
        if (activeTabIndex >= index) {
            setActiveTabIndex(Math.max(0, activeTabIndex - 1));
        }
    }
  };

  const handleExport = () => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetReport = () => {
    if (confirm('זה ימחק את כל הנתונים השמורים מקומית. להמשיך?')) {
      setReport(INITIAL_REPORT);
      setActiveTabIndex(0);
      setSelectedId(null);
    }
  };

  const handleDragStart = (id: string) => {
    if (!editMode) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!editMode || !draggedId || draggedId === targetId) return;
    
    const currentSections = [...activeTab.sections];
    const draggedIndex = currentSections.findIndex(s => s.id === draggedId);
    const targetIndex = currentSections.findIndex(s => s.id === targetId);
    if (draggedIndex === -1 || targetIndex === -1) return;

    const newSections = [...currentSections];
    const [draggedItem] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, draggedItem);
    handleUpdateActiveTabSections(newSections);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const effectiveSidebarOpen = isSidebarOpen && editMode;

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden select-none" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
         const file = e.target.files?.[0];
         if(!file) return;
         const reader = new FileReader();
         reader.onload = (ev) => {
            try {
              const json = JSON.parse(ev.target?.result as string);
              if(json.tabs) setReport(json);
              else if (json.sections) setReport({ ...INITIAL_REPORT, tabs: [{ title: 'מיובא', icon: '📥', sections: json.sections }] });
            } catch(e) {
                alert('קובץ לא תקין');
            }
         };
         reader.readAsText(file);
      }} />

      {showJsonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md no-print">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">קוד מקור (JSON)</h3>
              <button onClick={() => setShowJsonModal(false)} className="w-10 h-10 flex items-center justify-center bg-white border rounded-xl hover:bg-slate-50 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-950 font-mono text-xs ltr text-left" dir="ltr">
              <pre className="text-indigo-400">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* EDITOR PANEL - Now managing all tabs */}
      <div className={`${effectiveSidebarOpen ? 'w-[450px]' : 'w-0'} transition-all duration-500 border-l bg-white shadow-2xl flex flex-col overflow-hidden shrink-0 no-print`}>
        <EditorPanel 
          report={report}
          activeTabIndex={activeTabIndex}
          onSetActiveTab={setActiveTabIndex}
          onAddTab={handleAddTab}
          onDeleteTab={handleDeleteTab}
          onUpdate={handleUpdateReport}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={() => {}} 
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f8fafc]">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-10 z-50 sticky top-0 shadow-sm no-print">
          <div className="flex items-center gap-6">
            {editMode && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className={`w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 transition-all ${isSidebarOpen ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 shadow-sm'}`}
              >
                <span className="text-lg">{isSidebarOpen ? '✕' : '☰'}</span>
              </button>
            )}
            <div className="flex flex-col">
               <div className="flex items-center gap-3">
                  <h1 className="font-bold text-slate-900 text-xl tracking-tight leading-none">{activeTab.title}</h1>
               </div>
               <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {saveStatus === 'saved' ? 'מערכת מסונכרנת' : 'מעדכן שינויים...'}
                  </span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-2xl shadow-inner border border-slate-200">
             <button 
                onClick={() => { setEditMode(false); setSelectedId(null); }}
                className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${!editMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                תצוגה מקדימה
             </button>
             <button 
                onClick={() => setEditMode(true)}
                className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${editMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                מצב עריכה
             </button>
          </div>

          <div className="flex gap-2">
            {editMode && (
              <>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => setShowJsonModal(true)}>קוד מקור</button>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => fileInputRef.current?.click()}>טעינת דו"ח</button>
                <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-bold hover:bg-rose-600 hover:text-white transition-all" onClick={handleResetReport}>איפוס</button>
              </>
            )}
            <button className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-bold shadow-lg hover:bg-indigo-700 transition-all" onClick={handleExport}>שמירה וייצוא</button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${editMode ? 'p-8' : 'p-16'}`}>
          <div className="max-w-[1400px] mx-auto mb-10 text-right">
             <div className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-2 flex items-center gap-2">
                {activeTab.icon?.startsWith('data:image') || activeTab.icon?.startsWith('http') ? (
                    <img src={activeTab.icon} className="w-5 h-5 rounded object-cover" alt="" />
                ) : (
                    <span>{activeTab.icon || '📄'}</span>
                )}
                {activeTab.title}
             </div>
             <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-tight">{activeTab.subTitles || 'סקירה כללית'}</h2>
          </div>

          <div className={`max-w-[1400px] mx-auto grid grid-cols-12 gap-8 pb-32`}>
            {activeTab.sections.length === 0 ? (
              <div className="col-span-12 h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] text-slate-300 bg-white/50 border-slate-200">
                <span className="text-5xl mb-4">✨</span>
                <p className="text-lg font-bold text-slate-400">הטאב ריק. הוסיפו אובייקטים מתפריט העריכה.</p>
                {editMode && <button onClick={() => setIsSidebarOpen(true)} className="mt-2 text-indigo-600 font-bold underline">לחצו להוספת אובייקט</button>}
              </div>
            ) : (
              activeTab.sections.map((section) => (
                <div 
                  key={section.id} 
                  draggable={editMode && !selectedId}
                  onDragStart={() => handleDragStart(section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-300 ${draggedId === section.id ? 'opacity-30 scale-95' : 'opacity-100'} ${!editMode ? 'hover:scale-[1.002]' : ''}`}
                  style={{ gridColumn: `span ${section.styles?.colSpan || 12}` }}
                >
                  <SectionPreview 
                    section={section} 
                    isSelected={editMode && selectedId === section.id}
                    onDelete={editMode ? (id) => {
                        const newSections = activeTab.sections.filter(s => s.id !== id);
                        handleUpdateActiveTabSections(newSections);
                    } : undefined as any} 
                    onSelect={editMode ? setSelectedId : undefined as any}
                  />
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
