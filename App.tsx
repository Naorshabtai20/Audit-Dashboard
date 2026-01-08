
import React, { useState, useRef, useEffect } from 'react';
import { Report, Section, ReportTab } from './types';
import { INITIAL_REPORT, SERVICE_URL } from './constants';
import { EditorPanel } from './components/EditorPanel';
import { SectionPreview } from './components/SectionPreview';

const STORAGE_KEY = 'offline_report_data_v2';

// If a global `report` is injected (see `index.html`), open it in view-only mode
const GLOBAL_REPORT = (window as any).report ?? null;
const IS_GLOBAL_REPORT = GLOBAL_REPORT !== null && GLOBAL_REPORT !== undefined;

const App: React.FC = () =>
{
  const [report, setReport] = useState<Report>(() =>
  {
    // If a global report is provided, use it directly (view-only)
    if (IS_GLOBAL_REPORT)
    {
      try { return JSON.parse(JSON.stringify(GLOBAL_REPORT)) as Report; } catch (e) { return INITIAL_REPORT; }
    }

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
  const [resourceId, setResourceId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  // Default to edit mode; when a global report is provided we still allow editing but we don't save it
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
    // Do not save to localStorage when a global report is provided (view-only)
    if (IS_GLOBAL_REPORT) return;

    setSaveStatus('saving');
    const timer = setTimeout(() =>
    {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(report));
      setSaveStatus('saved');
    }, 500);
    return () => clearTimeout(timer);
  }, [report]);

  // Read optional id from query string and load remote report if configured
  useEffect(() =>
  {
    // When a global report is provided, do not attempt remote loading from query params
    if (IS_GLOBAL_REPORT) return;

    try
    {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');
      if (!id) return;
      setResourceId(id);
      if (!SERVICE_URL) return;
      setSaveStatus('saving');
      const url = `${SERVICE_URL.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
      fetch(url, { method: 'GET' })
        .then(async res =>
        {
          if (!res.ok) throw new Error(`Failed to fetch (${res.status})`);
          return res.json();
        })
        .then(data =>
        {
          // Accept full report or just { sections: [...] }
          if (data && data.tabs) setReport(data as Report);
          else if (data && data.sections) setReport({ tabs: [{ title: 'טעון מרחוק', icon: '☁️', sections: data.sections }] });
          else setReport(data as Report);
        })
        .catch(err =>
        {
          console.error('Remote load error', err);
          alert('טעינת הדו"ח מרחוק נכשלה: ' + err.message);
        })
        .finally(() => setSaveStatus('saved'));
    } catch (e) { console.error(e); }
  }, []);

  const handleSaveRemote = async () =>
  {
    if (!SERVICE_URL)
    {
      return;
    }

    let idToUse = resourceId;

    if (!idToUse)
    {
      // prompt for id in Hebrew
      const input = prompt('הכנס מזהה לשמירה (אותיות לטיניות, ספרות, "-" או "_"):');

      if (!input) return;
      const valid = /^[A-Za-z0-9_-]+$/.test(input);
      if (!valid)
      {
        alert('מזהה לא חוקי — השתמש רק באותיות לטיניות, ספרות, "-" או "_".');
        return;
      }
      idToUse = input;
      setResourceId(idToUse);
      // update query string without reloading
      try { const u = new URL(window.location.href); u.searchParams.set('id', idToUse); window.history.replaceState({}, '', u.toString()); } catch (e) { /* ignore */ }
    }

    try
    {
      setSaveStatus('saving');
      const url = `${SERVICE_URL.replace(/\/$/, '')}/${encodeURIComponent(idToUse)}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report),
      });
      if (!res.ok)
      {
        const txt = await res.text();
        throw new Error(`שגיאה בשמירה: ${res.status} ${txt}`);
      }
      setSaveStatus('saved');
      alert('נשמר בהצלחה לשירות המרוחק');
    } catch (err: any)
    {
      console.error(err);
      alert('שמירה נכשלת: ' + (err?.message || err));
      setSaveStatus('idle');
    }
  };

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

  const isProd = !!(import.meta.env && (import.meta.env.MODE === 'production' || import.meta.env.PROD));

  const handleExportHtml = () =>
  {
    try
    {
      // Serialize report and neutralize '<' to avoid closing script tags
      const json = JSON.stringify(report).replace(/</g, '\\u003c');
      const scriptTag = `<script>window.report = ${json};</script>`;

      let html = '<!doctype html>\n' + document.documentElement.outerHTML;

      // Replace any existing injected window.report script, otherwise insert before </head>
      const re = /<script>[\s\S]*?window\.report[\s\S]*?<\/script>/i;
      if (re.test(html)) html = html.replace(re, scriptTag);
      else html = html.replace('</head>', `${scriptTag}</head>`);

      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_page_${new Date().toISOString().slice(0, 10)}.html`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any)
    {
      console.error('HTML export failed', err);
      alert('שגיאה ביצוא לעמוד HTML: ' + (err?.message || err));
    }
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
    <div className="h-screen bg-[#f4f7fa] overflow-hidden select-none flex" dir="rtl">
      <header className="h-16 bg-white border-b flex items-center justify-between p-2 z-50 fixed top-0 left-0 right-0 shadow-sm no-print">
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
          {!IS_GLOBAL_REPORT && editMode && (
            <>
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => setShowJsonModal(true)}>JSON</button>
              <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm" onClick={() => fileInputRef.current?.click()}>ייבוא</button>
              <button className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl text-[11px] font-bold hover:bg-rose-600 hover:text-white transition-all" onClick={handleResetReport}>נקה הכל</button>
              {/* Save to remote service when id provided and SERVICE_URL configured */}
              <button
                hidden={!SERVICE_URL}
                onClick={handleSaveRemote}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-[11px] font-bold hover:bg-slate-50 transition-all shadow-sm"
              >שמור</button>
            </>
          )}
          {/* Always allow exporting to JSON even when a global report is provided */}
          <button className="px-6 py-2 bg-[#002d72] text-white rounded-xl text-[11px] font-bold shadow-xl hover:bg-blue-600 transition-all" onClick={handleExport}>ייצוא לקובץ</button>
          {isProd && (
            <button className="px-6 py-2 bg-emerald-600 text-white rounded-xl text-[11px] font-bold shadow-xl hover:bg-emerald-500 transition-all" onClick={handleExportHtml}>ייצוא HTML</button>
          )}
        </div>
      </header>

      <div className="flex-1 pt-16 flex overflow-hidden flex-row">
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
            className="absolute left-0 top-0 bottom-0 w-6 -ml-3 z-50 flex items-center justify-center pointer-events-none"
            style={{ touchAction: 'none' }}
          >
            {/* invisible non-interactive area so the splitter overlay doesn't block underlying scrollbars; actual resizing is handled by the editor's own handle */}
            <div className="h-full w-full opacity-0 pointer-events-none" />
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
            <>
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

        <div className="flex-1 flex flex-col min-w-0 bg-[#f4f7fa] overflow-hidden">
          <div className="flex-1 overflow-auto custom-scrollbar transition-all p-4">
            <div className="max-w-[1400px] mx-auto mb-10 text-right">
              <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-4xl mb-1">{activeTab.icon} {activeTab.title}</p>
              {activeTab.subTitles && <h2 className="text-[10px] font-black text-[#002d72] tracking-tighter">{activeTab.subTitles}</h2>}
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
          </div>
        </div>


      </div>
    </div>
  );
};

export default App;
