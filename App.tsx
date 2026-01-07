
import React, { useState, useRef, useEffect } from 'react';
import { Report, Section, ReportTab } from './types';
import { INITIAL_REPORT } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

const STORAGE_KEY = 'offline_report_data_v2';

const App: React.FC = () =>
{
  const [report, setReport] = useState<Report>(() =>
  {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved)
    {
      try
      {
        const parsed = JSON.parse(saved);
        if (parsed.tabs) return parsed;
        return { tabs: [{ title: 'ראשי', icon: '📄', sections: parsed.sections || [] }] };
      } catch (e)
      {
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

  // Auto-scroll logic: when selectedId changes, scroll the report to that item
  useEffect(() =>
  {
    if (selectedId && selectedId !== 'tab-settings')
    {
      const element = document.getElementById(selectedId);
      if (element)
      {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [selectedId]);

  useEffect(() =>
  {
    setSaveStatus('saving');
    const timer = setTimeout(() =>
    {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
      setSaveStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);

  const activeTab = report.tabs[activeTabIndex] || report.tabs[0];

  const handleUpdateReport = (updatedReport: Report) =>
  {
    setReport(updatedReport);
  };

  const handleUpdateActiveTabSections = (newSections: Section[]) =>
  {
    setReport(prev => ({
      ...prev,
      tabs: prev.tabs.map((tab, idx) => idx === activeTabIndex ? { ...tab, sections: newSections } : tab)
    }));
  };

  const handleAddTab = () =>
  {
    const newTab: ReportTab = {
      title: `טאב חדש ${report.tabs.length + 1}`,
      icon: "📁",
      sections: []
    };
    setReport(prev => ({ ...prev, tabs: [...prev.tabs, newTab] }));
    setActiveTabIndex(report.tabs.length);
  };

  const handleDeleteTab = (index: number) =>
  {
    if (report.tabs.length <= 1) return;
    setReport(prev => ({ ...prev, tabs: prev.tabs.filter((_, i) => i !== index) }));
    if (activeTabIndex >= index) setActiveTabIndex(Math.max(0, activeTabIndex - 1));
  };

  // Reorder tabs by dragging in the editor dropdown
  const handleMoveTab = (from: number, to: number) =>
  {
    if (from === to) return;
    setReport(prev =>
    {
      const newTabs = [...prev.tabs];
      const [moved] = newTabs.splice(from, 1);
      newTabs.splice(to, 0, moved);
      // Update active tab index if it was affected by the move
      let newActive = activeTabIndex;
      if (activeTabIndex === from) newActive = to;
      else if (activeTabIndex > from && activeTabIndex <= to) newActive = activeTabIndex - 1;
      else if (activeTabIndex < from && activeTabIndex >= to) newActive = activeTabIndex + 1;
      setActiveTabIndex(newActive);
      return { ...prev, tabs: newTabs };
    });
  };

  const handleExport = () =>
  {
    const data = JSON.stringify(report, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetReport = () =>
  {
    if (confirm('זה ימחק את כל הנתונים השמורים מקומית. להמשיך?'))
    {
      setReport({ tabs: [{ title: 'ראשי', icon: '📊', sections: [] }] });
      setActiveTabIndex(0);
      setSelectedId(null);
    }
  };

  const handleDragStart = (id: string) =>
  {
    if (!editMode) return;
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) =>
  {
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

  const handleDragEnd = () =>
  {
    setDraggedId(null);
  };

  const effectiveSidebarOpen = isSidebarOpen && editMode;
  // View-mode right tabs panel width & resizing
  const [viewPanelWidth, setViewPanelWidth] = useState<number>(320);
  const viewPanelRef = useRef<HTMLDivElement | null>(null);
  const isResizingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() =>
  {
    const onMouseMove = (e: MouseEvent) =>
    {
      if (!isResizingRef.current) return;
      const delta = startXRef.current - e.clientX;
      const newWidth = Math.min(Math.max(160, startWidthRef.current + delta), 800);
      setViewPanelWidth(newWidth);
    };
    const onMouseUp = () =>
    {
      isResizingRef.current = false;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () =>
    {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  return (
    <div className="flex h-screen bg-[#f4f7fa] overflow-hidden select-none" dir="rtl">
      <input type="file" ref={fileInputRef} className="hidden" onChange={(e) =>
      {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) =>
        {
          try
          {
            const json = JSON.parse(ev.target?.result as string);
            if (json.tabs) setReport(json);
            else if (json.sections) setReport({ tabs: [{ title: 'מיובא', icon: '📥', sections: json.sections }] });
          } catch (e)
          {
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
              <button onClick={() => setShowJsonModal(false)} aria-label="סגור" className="w-10 h-10 flex items-center justify-center bg-white border rounded-xl hover:bg-slate-50 transition-colors">×</button>
            </div>
            <div className="flex-1 overflow-auto p-8 bg-slate-950 font-mono text-xs ltr text-left" dir="ltr">
              <pre className="text-emerald-400">{JSON.stringify(report, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      <div className={`${(effectiveSidebarOpen || !editMode) ? '' : 'w-0'} relative transition-all duration-500 border-l bg-white shadow-2xl flex flex-col overflow-hidden shrink-0 no-print`} style={{ width: !editMode ? viewPanelWidth : undefined }} ref={viewPanelRef}>
        {/* Splitter handle: keep in the same place for both editor and viewer */}
        <div
          onMouseDown={(e) =>
          {
            isResizingRef.current = true;
            startXRef.current = e.clientX;
            startWidthRef.current = viewPanelRef.current ? viewPanelRef.current.offsetWidth : viewPanelWidth;
            document.body.style.cursor = 'col-resize';
          }}
          className="absolute left-0 top-0 bottom-0 w-6 -ml-3 z-50 flex items-center justify-center cursor-col-resize"
          style={{ touchAction: 'none' }}
        >
          {/* invisible interactive area to support live resizing */}
          <div className="h-full w-full opacity-0" />
        </div>

        {editMode && effectiveSidebarOpen ? (
          <EditorPanel
            report={{
              ...report,
              sections: activeTab.sections,
              tabTitle: activeTab.title,
              tabIcon: activeTab.icon,
              tabSubTitles: activeTab.subTitles
            }}
            onUpdate={(updatedData: any) =>
            {
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
            onMove={() => { }}
            onCloseSidebar={() => setIsSidebarOpen(false)}
            tabs={report.tabs}
            activeTabIndex={activeTabIndex}
            onAddTab={handleAddTab}
            onDeleteTab={handleDeleteTab}
            onSelectTab={(idx) => { setActiveTabIndex(idx); setSelectedId(null); }}
            onMoveTab={handleMoveTab}
            sidebarWidth={viewPanelWidth}
            onSidebarWidthChange={(w) => setViewPanelWidth(w)}
          />
        ) : (
          // View-mode tabs panel placed where the editor appears
          <>
            <div className="h-20 bg-[#002d72] text-white flex items-center p-4 shrink-0 relative">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">צופה הדו"ח</h2>
              </div>
            </div>

            <div className="overflow-auto">
              {report.tabs.map((t, idx) => (
                <div key={idx} className={`group flex items-center p-2 hover:bg-slate-50 ${idx === activeTabIndex ? 'text-slate-900' : 'text-slate-600'}`}>
                  <button
                    type="button"
                    onClick={() => { setActiveTabIndex(idx); setSelectedId(null); }}
                    className={`flex items-center gap-3 flex-1 flex-row-reverse justify-end text-right transition-all ${idx === activeTabIndex ? 'rounded-2xl border-2 bg-white shadow-lg p-3' : 'p-3 rounded-xl'}`}
                  >
                    <div className="text-right">
                      <div className={`font-black text-sm ${idx === activeTabIndex ? 'text-[#002d72]' : ''}`}>{t.title || `טאב ${idx + 1}`}</div>
                      <div className="text-[10px] text-slate-400">{(t.sections || []).length} פריטים</div>
                    </div>
                    <span className={`flex items-center justify-center w-6 h-6 rounded-full text-white text-sm transition-opacity duration-150 ${idx === activeTabIndex ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      {(t.icon && t.icon.length <= 2) ? t.icon : (t.title || 'T').charAt(0)}
                    </span>
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7fa]">
        <header className="h-20 bg-white border-b flex items-center justify-between px-10 z-50 sticky top-0 shadow-sm no-print">
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

        <main className="flex-1 overflow-y-auto custom-scrollbar transition-all p-8">
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
                  id={section.id}
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
                    onDelete={editMode ? (id) =>
                    {
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
