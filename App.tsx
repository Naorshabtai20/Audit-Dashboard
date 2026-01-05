
import React, { useState, useRef, useEffect } from 'react';
import { Report, Section, ReportTab } from './types';
import { INITIAL_REPORT } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

const STORAGE_KEY = 'offline_report_data_v2';

const App: React.FC = () => {
  const [report, setReport] = useState<Report>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.tabs) return parsed;
        // Migration for old format
        return { tabs: [{ title: 'ראשי', icon: '📄', sections: parsed.sections || [] }] };
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
        setReport(prev => ({ ...prev, tabs: prev.tabs.filter((_, i) => i !== index) }));
        if (activeTabIndex >= index) setActiveTabIndex(Math.max(0, activeTabIndex - 1));
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
      setReport({ tabs: [{ title: 'ראשי', icon: '📊', sections: [] }] });
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
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden select-none" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
         const file = e.target.files?.[0];
         if(!file) return;
         const reader = new FileReader();
         reader.onload = (ev) => {
            try {
              const json = JSON.parse(ev.target?.result as string);
              if(json.tabs) setReport(json);
              else if (json.sections) setReport({ tabs: [{ title: 'מיובא', icon: '📥', sections: json.sections }] });
            } catch(e) {
                alert('קובץ לא תקין');
            }
         };
         reader.readAsText(file);
      }} />

      {showJsonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md no-print">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold">קוד מקור (JSON)</h3>
              <button onClick={() => setShowJsonModal(false)} className="w-10 h-10 flex items-center justify-center bg-white border rounded-xl hover:bg-slate-50 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-950 font-mono text-xs ltr text-left" dir="ltr">
              <pre className="text-emerald-400">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* TABS SIDEBAR */}
      <div className="w-[100px] bg-[#002d72] flex flex-col items-center py-8 gap-6 shadow-2xl z-[60] shrink-0 no-print">
         <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center mb-4">
            <span className="text-2xl">⚡</span>
         </div>
         <div className="flex-1 flex flex-col gap-4 overflow-y-auto no-scrollbar w-full px-2">
            {report.tabs.map((tab, idx) => (
               <div key={idx} className="relative group w-full flex justify-center">
                  <button 
                    onClick={() => { setActiveTabIndex(idx); setSelectedId(null); }}
                    className={`w-16 h-16 rounded-3xl flex flex-col items-center justify-center transition-all duration-300 ${
                        activeTabIndex === idx 
                        ? 'bg-white text-[#002d72] shadow-[0_10px_20px_rgba(0,0,0,0.2)]' 
                        : 'text-white/40 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-2xl">{tab.icon || '📄'}</span>
                    <span className="text-[9px] font-black mt-1 truncate max-w-full px-1">{tab.title}</span>
                  </button>
                  {editMode && report.tabs.length > 1 && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); handleDeleteTab(idx); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[8px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >✕</button>
                  )}
               </div>
            ))}
            {editMode && (
                <button 
                    onClick={handleAddTab}
                    className="w-16 h-16 rounded-3xl border-2 border-dashed border-white/20 text-white/40 hover:text-white hover:border-white/60 transition-all flex items-center justify-center shrink-0"
                >
                    <span className="text-2xl">+</span>
                </button>
            )}
         </div>
      </div>

      <div className={`${effectiveSidebarOpen ? 'w-[450px]' : 'w-0'} transition-all duration-500 border-l bg-white shadow-2xl flex flex-col overflow-hidden shrink-0 no-print`}>
        <EditorPanel 
          report={{ 
            ...report, 
            sections: activeTab.sections,
            tabTitle: activeTab.title,
            tabIcon: activeTab.icon,
            tabSubTitles: activeTab.subTitles
          }} 
          onUpdate={(updatedData: any) => {
            const newTabs = report.tabs.map((tab, idx) => 
                idx === activeTabIndex ? { 
                  ...tab, 
                  sections: updatedData.sections || tab.sections,
                  title: updatedData.tabTitle ?? tab.title,
                  icon: updatedData.tabIcon ?? tab.icon,
                  subTitles: updatedData.tabSubTitles ?? tab.subTitles
                } : tab
            );
            handleUpdateReport({ ...report, tabs: newTabs });
          }} 
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={() => {}} 
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7fa]">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 sticky top-0 shadow-sm no-print">
          <div className="flex items-center gap-6">
            {editMode && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all ${isSidebarOpen ? 'bg-[#002d72] text-white' : 'bg-white text-[#002d72] shadow-sm'}`}
              >
                <span className="text-lg">{isSidebarOpen ? '✕' : '☰'}</span>
              </button>
            )}
            <div className="flex flex-col">
               <div className="flex items-center gap-3">
                  <h1 className="font-bold text-[#002d72] text-xl tracking-tight leading-none">{activeTab.title}</h1>
               </div>
               <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${saveStatus === 'saved' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {saveStatus === 'saved' ? 'נשמר מקומית' : 'שומר שינויים...'}
                  </span>
               </div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 p-1 rounded-2xl shadow-inner">
             <button 
                onClick={() => { setEditMode(false); setSelectedId(null); }}
                className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${!editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                תצוגה
             </button>
             <button 
                onClick={() => setEditMode(true)}
                className={`px-6 py-1.5 rounded-xl text-[11px] font-bold transition-all ${editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                עריכה
             </button>
          </div>

          <div className="flex gap-2">
            {editMode && (
              <>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => setShowJsonModal(true)}>JSON</button>
                <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => fileInputRef.current?.click()}>ייבוא</button>
                <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-bold hover:bg-rose-600 hover:text-white transition-all" onClick={handleResetReport}>נקה הכל</button>
              </>
            )}
            <button className="px-6 py-2 bg-[#002d72] text-white rounded-xl text-[11px] font-bold shadow-xl hover:bg-blue-600 transition-all" onClick={handleExport}>ייצוא לקובץ</button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${editMode ? 'p-8' : 'p-16'}`}>
          <div className="max-w-[1400px] mx-auto mb-10 text-right">
             <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mb-1">{activeTab.icon} {activeTab.title}</p>
             <h2 className="text-4xl font-black text-[#002d72] tracking-tighter">{activeTab.subTitles || 'מבט על'}</h2>
          </div>

          <div className={`max-w-[1400px] mx-auto grid grid-cols-12 gap-8 pb-32`}>
            {activeTab.sections.length === 0 ? (
              <div className="col-span-12 h-64 flex flex-col items-center justify-center border-2 border-dashed rounded-[3rem] text-slate-300 bg-white/50 border-slate-200">
                <span className="text-5xl mb-4">📄</span>
                <p className="text-lg font-bold">הטאב ריק. הוסיפו אובייקטים מהתפריט בצד.</p>
                {editMode && <button onClick={() => setIsSidebarOpen(true)} className="mt-2 text-[#002d72] font-bold underline">לחצו להוספת אובייקט</button>}
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
