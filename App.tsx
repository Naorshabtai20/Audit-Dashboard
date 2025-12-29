
import React, { useState, useRef } from 'react';
import { Report, Section } from './types';
import { INITIAL_REPORT } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

const App: React.FC = () => {
  const [report, setReport] = useState<Report>(INITIAL_REPORT);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const handleResetReport = () => {
    if (confirm('למחוק הכל ולהתחיל מחדש?')) {
      setReport({ sections: [] });
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
    
    setReport(prev => {
      const currentSections = [...prev.sections];
      const draggedIndex = currentSections.findIndex(s => s.id === draggedId);
      const targetIndex = currentSections.findIndex(s => s.id === targetId);
      if (draggedIndex === -1 || targetIndex === -1) return prev;
      const newSections = [...currentSections];
      const [draggedItem] = newSections.splice(draggedIndex, 1);
      newSections.splice(targetIndex, 0, draggedItem);
      return { ...prev, sections: newSections };
    });
  };

  const handleDragEnd = () => {
    setDraggedId(null);
  };

  const effectiveSidebarOpen = isSidebarOpen && editMode;

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
         const file = e.target.files?.[0];
         if(!file) return;
         const reader = new FileReader();
         reader.onload = (ev) => {
            try {
              const json = JSON.parse(ev.target?.result as string);
              if(json.sections) setReport(json);
            } catch(e) {}
         };
         reader.readAsText(file);
      }} />

      {showJsonModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-md">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-extrabold">קוד JSON של הדו"ח</h3>
              <button onClick={() => setShowJsonModal(false)} className="w-10 h-10 flex items-center justify-center bg-white border rounded-xl hover:bg-slate-50 transition-colors font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-950 font-mono text-xs ltr text-left leading-relaxed" dir="ltr">
              <pre className="text-emerald-400">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <div className={`${effectiveSidebarOpen ? 'w-[450px]' : 'w-0'} transition-all duration-500 border-l bg-white shadow-2xl flex flex-col overflow-hidden shrink-0`}>
        <EditorPanel 
          report={report} 
          onUpdate={setReport} 
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={() => {}} 
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7fa]">
        <header className="h-24 bg-white border-b flex items-center justify-between px-10 z-50 sticky top-0 shadow-sm">
          <div className="flex items-center gap-6">
            {editMode && (
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                className={`w-12 h-12 flex items-center justify-center rounded-2xl border transition-all ${isSidebarOpen ? 'bg-[#002d72] text-white' : 'bg-white text-[#002d72] shadow-sm'}`}
              >
                <span className="text-xl">{isSidebarOpen ? '✕' : '☰'}</span>
              </button>
            )}
            <div className="flex flex-col">
               <h1 className="font-extrabold text-[#002d72] text-2xl tracking-tight leading-none">דו"ח ניהולי</h1>
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Bank Pro Analytics</span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-slate-100 p-1.5 rounded-[1.5rem] shadow-inner">
             <button 
                onClick={() => { setEditMode(false); setSelectedId(null); }}
                className={`px-6 py-2 rounded-[1.2rem] text-[11px] font-extrabold transition-all ${!editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                צפייה (View)
             </button>
             <button 
                onClick={() => setEditMode(true)}
                className={`px-6 py-2 rounded-[1.2rem] text-[11px] font-extrabold transition-all ${editMode ? 'bg-white text-[#002d72] shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
             >
                עריכה (Edit)
             </button>
          </div>

          <div className="flex gap-2">
            {editMode && (
              <>
                <button className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-extrabold hover:bg-slate-50 transition-all shadow-sm" onClick={() => setShowJsonModal(true)}>JSON</button>
                <button className="px-5 py-3 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[11px] font-extrabold hover:bg-slate-50 transition-all shadow-sm" onClick={() => fileInputRef.current?.click()}>ייבוא</button>
                <button className="px-5 py-3 bg-rose-50 text-rose-600 rounded-2xl text-[11px] font-extrabold hover:bg-rose-600 hover:text-white transition-all" onClick={handleResetReport}>נקה</button>
              </>
            )}
            <button className="px-8 py-3 bg-[#002d72] text-white rounded-2xl text-[11px] font-extrabold shadow-xl hover:bg-blue-600 transition-all" onClick={handleExport}>ייצוא</button>
          </div>
        </header>

        <main className={`flex-1 overflow-y-auto custom-scrollbar transition-all ${editMode ? 'p-12' : 'p-20'}`}>
          <div className={`max-w-[1400px] mx-auto grid grid-cols-12 gap-10 pb-32`}>
            {report.sections.length === 0 ? (
              <div className="col-span-12 h-80 flex flex-col items-center justify-center border-4 border-dashed rounded-[4rem] text-slate-300 bg-white/50 border-slate-200">
                <span className="text-6xl mb-6">📄</span>
                <p className="text-xl font-extrabold">הדו"ח ריק</p>
                {editMode && <button onClick={() => setIsSidebarOpen(true)} className="mt-4 text-[#002d72] font-bold underline">הוסף אובייקט ראשון</button>}
              </div>
            ) : (
              report.sections.map((section) => (
                <div 
                  key={section.id} 
                  draggable={editMode}
                  onDragStart={() => handleDragStart(section.id)}
                  onDragOver={(e) => handleDragOver(e, section.id)}
                  onDragEnd={handleDragEnd}
                  className={`transition-all duration-300 ${draggedId === section.id ? 'opacity-30 scale-95' : 'opacity-100'} ${!editMode ? 'hover:scale-[1.005]' : ''}`}
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
    </div>
  );
};

export default App;
