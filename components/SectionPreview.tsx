
import React, { useState } from 'react';
import { Section, TextSection, DataChartSection, TableSection, KPISection, PastedGraphicSection, SummaryEvaluationSection, DatePickerSection, AnomalySection, AnomalyItem } from '../types';
import
{
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend
} from 'recharts';

const COLORS = ['#002d72', '#0077c8', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#f97316'];

const Card: React.FC<{
  children: React.ReactNode;
  styles: any;
  isSelected?: boolean;
  onDelete?: () => void;
  onSelect?: () => void;
  noPadding?: boolean;
  isDynamicHeight?: boolean;
  pill?: boolean;
  className?: string;
}> = ({ children, styles, isSelected, onDelete, onSelect, noPadding, isDynamicHeight, pill, className }) => (
  <div
    onClick={(e) => { if (onSelect) { e.stopPropagation(); onSelect(); } }}
    className={`group transition-all duration-300 relative w-full flex flex-col overflow-visible ${pill ? 'rounded-[100px]' : 'rounded-[3rem]'
      } ${isSelected
        ? 'bg-white shadow-[0_40px_100px_-20px_rgba(0,45,114,0.15)] border-[#002d72] z-30 border-2 scale-[1.01]'
        : 'bg-white shadow-lg border border-slate-100 hover:border-slate-200 z-10'
      } ${!onSelect ? 'cursor-default' : 'cursor-pointer'} ${className || ''}`}
    style={{
      minHeight: styles.height ? `${styles.height}px` : 'auto',
      height: isDynamicHeight ? 'auto' : (styles.height ? `${styles.height}px` : 'auto'),
      textAlign: styles.alignment || 'right',
      backgroundColor: styles.backgroundColor || '#fff',
    }}
  >
    {onDelete && (
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-4 right-4 w-8 h-8 bg-rose-500 text-white rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 z-[70] shadow-lg border-2 border-white"
      >
        <span className="text-sm font-bold">✕</span>
      </button>
    )}

    <div className={`${noPadding ? 'p-0' : 'p-10'} flex-1 flex flex-col relative h-full w-full overflow-hidden`}>
      {children}
    </div>
  </div>
);

export const SectionPreview: React.FC<{
  section: Section,
  isSelected: boolean,
  onDelete: (id: string) => void,
  onSelect: (id: string) => void
}> = ({ section, isSelected, onDelete, onSelect }) =>
  {
    const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);
    const styles = section.styles || {};
    const fontScale = styles.fontScale || 1;
    const dataFontScale = styles.dataFontScale || 1;
    const labelFontScale = styles.labelFontScale || 1;
    const textColor = styles.color || '#002d72';
    // For text sections, if no explicit title is set, use the first line of the text content as a display title
    const displayTitle = section.title || (section.type === 'text' && (section as TextSection).content ? ((section as TextSection).content.split('\n')[0] || '') : '');

    const renderSummaryEvaluation = (sec: SummaryEvaluationSection) => (
      <div className="flex flex-col gap-8 w-full h-full p-2 overflow-y-auto custom-scrollbar">
        {/* Top Row: Briefing and Score */}
        <div className="grid grid-cols-12 gap-8 min-h-[500px]">
          {/* Left: Summary Briefing */}
          <div className="col-span-12 lg:col-span-8 bg-white rounded-[3rem] p-12 shadow-md border border-slate-100 flex flex-col relative">
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.4em] mb-8 text-right block w-full">SUMMARY_BRIEFING</span>
            <div className="flex-1 flex items-center justify-end">
              <p className="text-[#002d72] font-black italic leading-tight text-right w-full" style={{ fontSize: `${2 * dataFontScale}rem`, letterSpacing: '-0.02em' }}>
                "{sec.briefingText || 'הזן טקסט סיכום כאן...'}"
              </p>
            </div>
            <div className="mt-12 h-2 w-32 bg-orange-400 rounded-full self-end"></div>
          </div>

          {/* Right: Score Display */}
          <div className="col-span-12 lg:col-span-4 bg-white rounded-[3rem] p-12 shadow-md border border-slate-100 flex flex-col items-center justify-center text-center relative">
            {/* Score Segments */}
            <div className="flex gap-2.5 mb-12">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-2.5 w-12 rounded-full transition-all duration-700 ${i <= sec.score ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-slate-100'}`}></div>
              ))}
            </div>

            <div className="flex flex-col items-center">
              <span className="text-[6rem] font-black text-rose-500 leading-none tracking-tighter" style={{ fontFamily: 'Segoe UI, Arial, sans-serif' }}>{sec.score || 0}/5</span>
              <span className="text-xl font-black text-rose-500 mt-4 uppercase tracking-widest">{sec.scoreLabel || 'סטטוס'}</span>
            </div>

            <div className="mt-16 pt-8 border-t border-slate-50 w-full flex justify-center">
              <span className="text-[10px] font-black text-blue-900/20 uppercase tracking-[0.4em] leading-none">{sec.footerLabel || 'COMPLIANCE MAGNITUDE VERIFIED'}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Deficiencies and Recommendations */}
        <div className="grid grid-cols-12 gap-8">
          {/* Recommendations Box (Audit) */}
          <div className="col-span-12 lg:col-span-6 bg-[#f8fbff] rounded-[3rem] p-12 shadow-sm border border-emerald-50 relative">
            <div className="flex items-center gap-3 justify-end mb-10">
              <h3 className="text-xl font-black text-emerald-700">המלצות הביקורת</h3>
              <div className="w-3 h-3 bg-emerald-400 rounded-full"></div>
            </div>
            <ul className="space-y-6">
              {(sec.recommendations || []).map((item, idx) => (
                <li key={idx} className="flex items-start gap-4 justify-end text-right">
                  <p className="text-slate-700 font-bold text-lg leading-snug">{item}</p>
                  <span className="text-emerald-500 text-xl font-black shrink-0">✓</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Deficiencies Box (Main) */}
          <div className="col-span-12 lg:col-span-6 bg-[#fff8f8] rounded-[3rem] p-12 shadow-sm border border-rose-50 relative">
            <div className="flex items-center gap-3 justify-end mb-10">
              <h3 className="text-xl font-black text-rose-700">ליקויים עיקריים</h3>
              <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
            </div>
            <ul className="space-y-8">
              {(sec.deficiencies || []).map((item, idx) => (
                <li key={idx} className="flex items-center gap-6 justify-end text-right group">
                  <p className="text-slate-700 font-black text-lg leading-snug">{item}</p>
                  <span className="text-3xl font-black italic text-slate-200/60 group-hover:text-rose-200 transition-colors leading-none">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );

    const renderAnomaly = (sec: AnomalySection) => (
      <div className="space-y-6 w-full h-full p-2">
        {sec.title && (
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-[#002d72]" style={{ fontSize: `${1.5 * fontScale}rem` }}>{sec.title}</h2>
          </div>
        )}
        {(sec.items || []).map((item, i) =>
        {
          const isExpanded = expandedAnomalyId === item.id;
          const indexStr = (i + 1).toString().padStart(2, '0');

          return (
            <div
              key={item.id}
              onClick={(e) => { e.stopPropagation(); setExpandedAnomalyId(isExpanded ? null : item.id); }}
              className={`transition-all duration-500 overflow-hidden flex flex-col relative ${isExpanded
                ? 'bg-white rounded-[3rem] shadow-xl ring-1 ring-blue-50/50 mb-8'
                : 'bg-white rounded-[100px] border border-blue-50/50 shadow-md hover:shadow-lg cursor-pointer'
                }`}
            >
              {/* Header (Matching Image 1) */}
              <div className="p-8 pr-12 flex items-center justify-between relative z-10 min-h-[140px]">
                {/* Left Side: Red Bars */}
                <div className="flex flex-col items-center gap-2 shrink-0">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(dot => (
                      <div key={dot} className={`w-2.5 h-10 rounded-full transition-all ${dot <= item.riskLevel ? 'bg-rose-500' : 'bg-slate-100'}`}></div>
                    ))}
                  </div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CONTRACT DETAILS</span>
                </div>

                {/* Center Part: Information */}
                <div className="flex flex-col text-right flex-1 px-12">
                  <h3 className="text-2xl font-black text-[#0f172a] tracking-tight leading-tight mb-4">{item.title}</h3>
                  <div className="flex items-center justify-end gap-6">
                    <span className="text-xs font-bold text-indigo-500 uppercase tracking-widest">סטטוס: {item.status}</span>
                    <div className="bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 flex items-center gap-3">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">חטיבה:</span>
                      <span className="text-xs font-bold text-slate-700">{item.department}</span>
                    </div>
                  </div>
                </div>

                {/* Right Side: Large Ghost Number */}
                <div className="text-[6rem] font-black text-slate-50/70 italic tracking-tighter select-none pointer-events-none pr-4 leading-none">
                  {indexStr}
                </div>
              </div>

              {/* Open View (Matching Image 2) */}
              {isExpanded && (
                <div className="px-12 pb-14 pt-4 animate-in slide-in-from-top-4 duration-500 bg-white relative z-20">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-10 border-t-2 border-slate-50">
                    {/* Right Column: Detailed Report */}
                    <div className="space-y-6 text-right order-last lg:order-first">
                      <div className="space-y-6">
                        <span className="text-[12px] font-black text-indigo-500 uppercase tracking-[0.6em] block">DETAILED ANOMALY REPORT</span>
                        <p className="text-slate-800 text-2xl font-bold leading-relaxed tracking-tight">
                          {item.detailedReport || 'אין פירוט טכני זמין עבור ממצא זה.'}
                        </p>
                      </div>
                    </div>

                    {/* Left Column: Analysis & Meta */}
                    <div className="space-y-10 flex flex-col">
                      {/* Analysis Box */}
                      <div className="bg-[#f8fbff] p-10 rounded-[3rem] space-y-4 border border-blue-50/50 shadow-inner">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] block text-right">RISK FACTOR ANALYSIS</span>
                        <p className="text-slate-600 font-bold text-lg text-right leading-relaxed">
                          הממצא זוהה ברמת חומרה <span className="text-rose-500 font-black">{item.riskLevel}/5</span>. {item.riskAnalysis || 'נדרשת בחינה מיידית של תהליכי הבקרה.'}
                        </p>
                      </div>

                      {/* Meta Bubbles */}
                      <div className="grid grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-8 rounded-[2rem] text-center border border-slate-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">INTERNAL REFERENCE</span>
                          <span className="font-mono text-slate-800 font-black text-lg">{item.internalRef || 'REF-X00'}</span>
                        </div>
                        <div className="bg-indigo-50 p-8 rounded-[2rem] text-center border border-indigo-100 flex flex-col items-center justify-center">
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-3">PROTOCOL STATUS</span>
                          <span className="text-indigo-600 font-black text-3xl uppercase tracking-tighter">{item.status || 'בטיפול'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );

    const renderKPI = (sec: KPISection) => (
      <div className="flex flex-wrap gap-4 w-full p-2">
        {sec.metrics.map((m, i) =>
        {
          const deltaStr = m.delta?.toString() || '';
          const isPositive = deltaStr.startsWith('+');
          const isNegative = deltaStr.startsWith('-');
          const trendColor = isPositive ? '#10b981' : (isNegative ? '#ef4444' : '#94a3b8');
          const trendIcon = isPositive ? '▲' : (isNegative ? '▼' : '');

          return (
            <div key={i} className="bg-slate-50 p-4 rounded-[2.5rem] text-right shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:border-[#002d72]/20 hover:shadow-md min-w-[150px] flex-1">
              <p className="font-black text-slate-400 uppercase tracking-widest mb-2 truncate max-w-full text-sm" style={{ fontSize: `${11 * labelFontScale}px` }} title={m.label}>{m.label}</p>
              <div className="flex items-baseline justify-between gap-2 w-full">
                <span className="font-black leading-none tracking-tighter" style={{ fontSize: `${2.6 * dataFontScale}rem`, color: textColor }}>{m.value}</span>
                {m.delta && (
                  <div className="flex items-center font-black text-sm" style={{ fontSize: `${13 * labelFontScale}px`, color: trendColor }}>
                    <span className="ml-1 text-[10px]">{trendIcon}</span>
                    <span>{m.delta}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );

    const renderChart = (sec: DataChartSection) =>
    {
      const availableKeys = (sec.seriesKeys || []).filter(key =>
        sec.data.some(d => d[key] !== undefined)
      );

      return (
        <div className="flex-1 w-full min-h-0 relative">
          <ResponsiveContainer width="100%" height="100%">
            {['pie', 'donut'].includes(sec.chartKind) ? (
              <PieChart>
                <Pie
                  data={sec.data}
                  nameKey={sec.xKey || 'x'}
                  dataKey={availableKeys[0] || 'y'}
                  cx="50%" cy="50%"
                  innerRadius={sec.chartKind === 'donut' ? '60%' : 0}
                  outerRadius="85%"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {sec.data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '16px', fontWeight: 'bold' }} />
                <Legend wrapperStyle={{ fontWeight: 'bold', paddingTop: '20px', fontSize: `${12 * labelFontScale}px` }} />
              </PieChart>
            ) : (
              <BarChart data={sec.data} margin={{ top: 20, right: 30, left: 60, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={sec.xKey || 'x'}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 * labelFontScale, fontWeight: '900', fill: '#64748b' }}
                  dy={15}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11 * labelFontScale, fontWeight: '900', fill: '#64748b' }}
                  dx={-15}
                  width={60}
                />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', padding: '15px' }} />
                <Legend
                  verticalAlign="top"
                  align="right"
                  wrapperStyle={{ paddingBottom: '30px', fontWeight: '900', fontSize: `${12 * labelFontScale}px` }}
                />
                {availableKeys.map((key, i) => (
                  sec.chartKind === 'line'
                    ? <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={4} dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} />
                    : <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[10, 10, 0, 0]} barSize={40} label={{ position: 'top', fontSize: 10 * dataFontScale, fontWeight: 'bold', fill: '#002d72' }} />
                ))}
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      );
    };

    return (
      <Card
        styles={styles}
        isSelected={isSelected}
        onDelete={onDelete ? () => onDelete(section.id) : undefined}
        onSelect={onSelect ? () => onSelect(section.id) : undefined}
        noPadding={section.type === 'summary_evaluation' || section.type === 'kpi' || section.type === 'anomaly' || section.type === 'pasted_graphic'}
        isDynamicHeight={section.type === 'date_picker' || section.type === 'anomaly' || section.type === 'pasted_graphic' || section.type === 'summary_evaluation' || section.type === 'text'}
        pill={section.type === 'date_picker'}
        className={section.type === 'summary_evaluation' ? 'bg-[#f8fbff]' : ''}
      >
        {section.type === 'summary_evaluation' ? (
          renderSummaryEvaluation(section as SummaryEvaluationSection)
        ) : (
          <div className="flex flex-col h-full w-full">
            {displayTitle && !['date_picker', 'anomaly', 'pasted_graphic'].includes(section.type) && (
              <h2 className="mb-8 tracking-tighter leading-none border-r-8 border-[#002d72] pr-6 font-black shrink-0 text-right" style={{ color: textColor, fontSize: `${1.7 * fontScale}rem` }}>{displayTitle}</h2>
            )}

            {section.type === 'kpi' && renderKPI(section as KPISection)}
            {section.type === 'data_chart' && renderChart(section as DataChartSection)}
            {section.type === 'anomaly' && renderAnomaly(section as AnomalySection)}

            {section.type === 'pasted_graphic' && (
              <div className="w-full h-full flex flex-col items-center justify-center p-0 relative group">
                {(section as PastedGraphicSection).src ? (
                  <>
                    <img src={(section as PastedGraphicSection).src} className="w-full h-full object-contain rounded-[2.5rem]" alt="Graph" />
                    {(section as PastedGraphicSection).caption && (
                      <div className="absolute bottom-6 bg-white/90 backdrop-blur-md px-6 py-2 rounded-full border border-slate-100 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-black text-[#002d72]">{(section as PastedGraphicSection).caption}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-200 gap-4 py-20">
                    <span className="text-8xl">🖼️</span>
                    <p className="font-black text-lg">אין תמונה מוצגת. ערוך כדי להוסיף.</p>
                  </div>
                )}
              </div>
            )}

            {section.type === 'table' && (
              <div className="overflow-x-auto rounded-[2.5rem] border border-slate-100 shadow-sm bg-white flex-1 custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-[#002d72] text-white">
                    <tr>{(section as TableSection).headers.map((h, i) => <th key={i} className="p-6 font-black uppercase text-right tracking-widest" style={{ fontSize: `${11 * labelFontScale}px` }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(section as TableSection).rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-blue-50/30 transition-colors'}>
                        {row.map((cell, ci) => <td key={ci} className="p-6 border-b border-slate-100 font-bold text-[#002d72]" style={{ fontSize: `${15 * dataFontScale}px` }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.type === 'text' && (
              <div className="whitespace-pre-wrap leading-relaxed font-bold text-right text-[#002d72] flex-1" style={{ fontSize: `${1.1 * fontScale}rem` }}>
                {(section as TextSection).content}
              </div>
            )}

            {section.type === 'date_picker' && (
              <div className="flex items-center gap-10 px-12 py-3">
                <div className="w-24 h-24 bg-blue-50 rounded-[3rem] flex items-center justify-center shrink-0 shadow-inner border border-blue-100"><span className="text-5xl">📅</span></div>
                <div className="flex flex-col text-right">
                  <span className="font-black text-[#002d72]/30 uppercase tracking-[0.3em] mb-2" style={{ fontSize: `${12 * labelFontScale}px` }}>{(section as DatePickerSection).label}</span>
                  <span className="font-black text-[#002d72] tracking-tighter" style={{ fontSize: `${2.8 * dataFontScale}rem` }}>{(section as DatePickerSection).date.split('-').reverse().join('/')}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };
