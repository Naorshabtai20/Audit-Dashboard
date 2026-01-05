
import React, { useState } from 'react';
import { Section, TextSection, DataChartSection, TableSection, KPISection, PastedGraphicSection, SummaryEvaluationSection, DatePickerSection, AnomalySection, AnomalyItem } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend
} from 'recharts';

const COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#6366f1', '#f97316'];

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
    onClick={(e) => { if(onSelect) { e.stopPropagation(); onSelect(); } }}
    className={`group transition-all duration-300 relative w-full flex flex-col overflow-visible ${
        pill ? 'rounded-[100px]' : 'rounded-[2.5rem]'
    } ${
        isSelected 
        ? 'bg-white shadow-[0_40px_100px_-20px_rgba(79,70,229,0.15)] border-indigo-600 z-30 border-2 scale-[1.01]' 
        : 'bg-white shadow-lg border border-slate-100 hover:border-slate-200 z-10'
    } ${!onSelect ? 'cursor-default' : 'cursor-pointer'} ${className || ''}`}
    style={{ 
        minHeight: styles.height ? `${styles.height}px` : 'auto',
        height: isDynamicHeight ? 'auto' : (styles.height ? `${styles.height}px` : 'auto'),
        textAlign: styles.alignment || 'right',
        backgroundColor: styles.backgroundColor || '#fff'
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
}> = ({ section, isSelected, onDelete, onSelect }) => {
  const styles = section.styles || {};
  const fontScale = styles.fontScale || 1;
  const dataFontScale = styles.dataFontScale || 1;
  const labelFontScale = styles.labelFontScale || 1;
  const textColor = styles.color || '#0f172a';

  const renderSummaryEvaluation = (sec: SummaryEvaluationSection) => (
    <div className="grid grid-cols-12 gap-6 w-full h-full p-8 bg-slate-50 overflow-y-auto custom-scrollbar">
      <div className="col-span-12 lg:col-span-8 bg-white rounded-[2.5rem] p-12 shadow-sm flex flex-col relative border border-slate-100">
        <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] mb-6">SUMMARY_BRIEFING</span>
        <div className="flex-1 flex items-center">
            <p className="text-slate-900 font-extrabold italic leading-relaxed text-right" style={{ fontSize: `${1.4 * dataFontScale}rem` }}>
              "{sec.briefingText || 'הזן טקסט סיכום כאן...'}"
            </p>
        </div>
        <div className="mt-8 h-1.5 w-24 bg-orange-400 rounded-full"></div>
      </div>

      <div className="col-span-12 lg:col-span-4 bg-white rounded-[2.5rem] p-12 shadow-sm flex flex-col items-center justify-center text-center border border-slate-100">
        <div className="flex gap-2 mb-10">
           {[1,2,3,4,5].map(i => (
             <div key={i} className={`h-2.5 w-10 rounded-full transition-all duration-500 ${i <= sec.score ? 'bg-indigo-500 shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-100'}`}></div>
           ))}
        </div>
        <div className="flex flex-col items-center">
          <span className="text-7xl font-black text-indigo-600 leading-none tracking-tighter">{sec.score || 0}/5</span>
          <span className="text-xl font-black text-indigo-500 mt-4 uppercase tracking-widest">{sec.scoreLabel || 'סטטוס'}</span>
        </div>
        <div className="mt-14 pt-6 border-t border-slate-50 w-full">
           <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] leading-none">{sec.footerLabel || 'COMPLIANCE MAGNITUDE VERIFIED'}</span>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 bg-rose-50/50 rounded-[2.5rem] p-10 border border-rose-100 shadow-sm flex flex-col min-h-[300px]">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
           <span className="font-black text-rose-600 text-sm uppercase tracking-widest">ליקויים עיקריים</span>
        </div>
        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
           {sec.deficiencies.length > 0 ? sec.deficiencies.map((d, i) => (
             <div key={i} className="flex items-start gap-5 text-right">
                <span className="text-rose-300 font-black italic text-2xl leading-none">0{i+1}</span>
                <p className="font-bold text-slate-700 text-sm leading-relaxed">{d}</p>
             </div>
           )) : <p className="text-slate-300 italic text-sm">טרם הוזנו ליקויים</p>}
        </div>
      </div>

      <div className="col-span-12 lg:col-span-6 bg-emerald-50/50 rounded-[2.5rem] p-10 border border-emerald-100 shadow-sm flex flex-col min-h-[300px]">
        <div className="flex items-center gap-3 mb-8">
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
           <span className="font-black text-emerald-600 text-sm uppercase tracking-widest">המלצות הביקורת</span>
        </div>
        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
           {sec.recommendations.length > 0 ? sec.recommendations.map((r, i) => (
             <div key={i} className="flex items-start gap-4 text-right">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-emerald-200 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-emerald-600 text-xs font-black">✓</span>
                </div>
                <p className="font-bold text-slate-700 text-sm leading-relaxed">{r}</p>
             </div>
           )) : <p className="text-slate-300 italic text-sm">טרם הוזנו המלצות</p>}
        </div>
      </div>
    </div>
  );

  const renderKPI = (sec: KPISection) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full h-full p-2">
      {sec.metrics.map((m, i) => {
        const deltaStr = m.delta?.toString() || '';
        const isPositive = deltaStr.startsWith('+');
        const isNegative = deltaStr.startsWith('-');
        const trendColor = isPositive ? '#10b981' : (isNegative ? '#ef4444' : '#94a3b8');
        const trendIcon = isPositive ? '▲' : (isNegative ? '▼' : '');

        return (
          <div key={i} className="bg-slate-50 p-8 rounded-[2.5rem] text-right shadow-sm border border-slate-100 flex flex-col justify-center transition-all hover:bg-white hover:border-indigo-200 hover:shadow-md">
            <p className="font-black text-slate-400 uppercase tracking-widest mb-3" style={{ fontSize: `${11 * labelFontScale}px` }}>{m.label}</p>
            <div className="flex items-baseline justify-between gap-4">
              <span className="font-black leading-none tracking-tighter" style={{ fontSize: `${2.6 * dataFontScale}rem`, color: textColor }}>{m.value}</span>
              {m.delta && (
                <div className="flex items-center font-black" style={{ fontSize: `${13 * labelFontScale}px`, color: trendColor }}>
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

  const renderChart = (sec: DataChartSection) => {
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
                    : <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[10, 10, 0, 0]} barSize={40} label={{ position: 'top', fontSize: 10 * dataFontScale, fontWeight: 'bold', fill: '#4f46e5' }} />
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
        noPadding={section.type === 'summary_evaluation' || section.type === 'kpi'}
        isDynamicHeight={section.type === 'date_picker'}
        pill={section.type === 'date_picker'}
        className={section.type === 'summary_evaluation' ? 'bg-slate-50' : ''}
    >
        {section.type === 'summary_evaluation' ? (
          renderSummaryEvaluation(section as SummaryEvaluationSection)
        ) : (
          <div className="flex flex-col h-full w-full">
            {section.title && !['date_picker', 'anomaly'].includes(section.type) && (
              <h2 className="mb-8 tracking-tighter leading-none border-r-8 border-indigo-600 pr-6 font-black shrink-0 text-right" style={{ color: textColor, fontSize: `${1.7 * fontScale}rem` }}>{section.title}</h2>
            )}
            
            {section.type === 'kpi' && renderKPI(section as KPISection)}
            {section.type === 'data_chart' && renderChart(section as DataChartSection)}

            {section.type === 'table' && (
              <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm bg-white flex-1 custom-scrollbar">
                <table className="w-full text-right border-collapse">
                  <thead className="bg-[#0f172a] text-white">
                    <tr>{(section as TableSection).headers.map((h, i) => <th key={i} className="p-6 font-black uppercase text-right tracking-widest" style={{ fontSize: `${11 * labelFontScale}px` }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(section as TableSection).rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50 hover:bg-indigo-50/30 transition-colors'}>
                        {row.map((cell, ci) => <td key={ci} className="p-6 border-b border-slate-100 font-bold text-slate-700" style={{ fontSize: `${15 * dataFontScale}px` }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.type === 'text' && <div className="whitespace-pre-wrap leading-relaxed font-bold text-right text-slate-800" style={{ fontSize: `${1.1 * fontScale}rem` }}>{(section as TextSection).content}</div>}

            {section.type === 'date_picker' && (
              <div className="flex items-center gap-10 px-12 py-3">
                <div className="w-24 h-24 bg-indigo-50 rounded-[3rem] flex items-center justify-center shrink-0 shadow-inner border border-indigo-100"><span className="text-5xl">📅</span></div>
                <div className="flex flex-col text-right">
                  <span className="font-black text-slate-400 uppercase tracking-[0.3em] mb-2" style={{ fontSize: `${12 * labelFontScale}px` }}>{(section as DatePickerSection).label}</span>
                  <span className="font-black text-indigo-600 tracking-tighter" style={{ fontSize: `${2.8 * dataFontScale}rem` }}>{(section as DatePickerSection).date.split('-').reverse().join('/')}</span>
                </div>
              </div>
            )}
          </div>
        )}
    </Card>
  );
};
