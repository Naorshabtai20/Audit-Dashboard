
import React, { useState } from 'react';
import { Section, TextSection, DataChartSection, TableSection, KPISection, PastedGraphicSection, SummaryEvaluationSection, DatePickerSection, AnomalySection } from '../types';
import { 
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
    pill?: boolean;
    className?: string;
    type: string;
}> = ({ children, styles, isSelected, onDelete, onSelect, noPadding, pill, className, type }) => {
  const isFixedHeight = type === 'data_chart' || type === 'pasted_graphic';
  const displayHeight = isFixedHeight ? (styles.height ? `${styles.height}px` : '400px') : 'auto';
  
  return (
    <div 
      onClick={(e) => { if(onSelect) { e.stopPropagation(); onSelect(); } }}
      className={`group transition-all duration-500 relative w-full flex flex-col overflow-hidden ${
          pill ? 'rounded-[100px]' : 'rounded-[1.5rem] lg:rounded-[2.5rem]'
      } ${
          isSelected 
          ? 'bg-white shadow-[0_50px_100px_-20px_rgba(0,45,114,0.3)] border-[#002d72] ring-4 ring-[#002d72]/10 z-30 border-2 scale-[1.02]' 
          : 'bg-white shadow-lg border border-slate-100 hover:border-slate-200 z-10'
      } ${!onSelect ? 'cursor-default' : 'cursor-pointer'} ${className || ''}`}
      style={{ 
          height: displayHeight,
          minHeight: isFixedHeight ? displayHeight : 'none',
          textAlign: styles.alignment || 'right',
          backgroundColor: styles.backgroundColor || '#fff'
      }}
    >
      {onDelete && (
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-600 z-[70] shadow-lg border border-white"
        >
          <span className="text-[10px] font-bold">✕</span>
        </button>
      )}
      
      <div 
        className={`flex-1 flex flex-col relative w-full ${isFixedHeight ? 'overflow-hidden' : 'overflow-visible'}`}
        style={{ padding: noPadding ? 0 : '24px' }}
      >
        {children}
      </div>
    </div>
  );
};

export const SectionPreview: React.FC<{ 
    section: Section, 
    isSelected: boolean,
    onDelete: (id: string) => void,
    onSelect: (id: string) => void
}> = ({ section, isSelected, onDelete, onSelect }) => {
  const [expandedAnomalyId, setExpandedAnomalyId] = useState<string | null>(null);
  const styles = section.styles || {};
  
  const fontScale = (styles.fontScale || 1);
  const dataFontScale = (styles.dataFontScale || 1);
  const labelFontScale = (styles.labelFontScale || 1);
  const textColor = styles.color || '#002d72';

  const renderSummaryEvaluation = (sec: SummaryEvaluationSection) => (
    <div className="flex flex-col w-full text-right gap-4" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      <div className="flex flex-wrap lg:flex-nowrap gap-4 shrink-0">
        <div className="flex-grow basis-[300px] bg-white rounded-[1.2rem] shadow-sm border border-slate-100 flex flex-col justify-center p-6">
          <span className="font-black text-orange-500 uppercase tracking-widest block" style={{ fontSize: `${12 * labelFontScale}px`, marginBottom: '0.5rem' }}>SUMMARY_BRIEFING</span>
          <p className="text-[#002d72] font-black italic leading-tight" style={{ fontSize: `${1.1 * dataFontScale}rem` }}>
            "{sec.briefingText || 'הזן טקסט סיכום כאן...'}"
          </p>
        </div>

        <div className="flex-none w-full lg:w-[240px] bg-white rounded-[1.2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center p-6">
          <div className="flex mb-3 gap-1">
             {[1,2,3,4,5].map(i => (
               <div key={i} className={`rounded-full ${i <= sec.score ? 'bg-rose-500' : 'bg-slate-100'}`} style={{ height: '0.4rem', width: '1.5rem' }}></div>
             ))}
          </div>
          <div className="flex flex-col items-center">
            <span className="font-black text-rose-500 leading-none" style={{ fontSize: `${3 * dataFontScale}rem` }}>{sec.score || 0}/5</span>
            <span className="font-black text-rose-500 uppercase tracking-widest" style={{ fontSize: `${1 * fontScale}rem`, marginTop: '0.2rem' }}>{sec.scoreLabel || 'סטטוס'}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[280px] bg-[#f8fbff] rounded-[1.2rem] shadow-inner border border-emerald-50 p-6">
              <h3 className="font-black text-emerald-700" style={{ fontSize: `${1.1 * fontScale}rem`, marginBottom: '0.8rem' }}>המלצות הביקורת</h3>
              <ul className="flex flex-col gap-2">
                  {(sec.recommendations || []).map((item, idx) => (
                      <li key={idx} className="flex items-start justify-end gap-2">
                          <p className="text-slate-700 font-bold leading-snug" style={{ fontSize: `${0.95 * dataFontScale}rem` }}>{item}</p>
                          <span className="text-emerald-500 font-black" style={{ fontSize: `${1 * dataFontScale}rem` }}>✓</span>
                      </li>
                  ))}
              </ul>
          </div>
          <div className="flex-1 min-w-[280px] bg-[#fff8f8] rounded-[1.2rem] shadow-inner border border-rose-50 p-6">
              <h3 className="font-black text-rose-700" style={{ fontSize: `${1.1 * fontScale}rem`, marginBottom: '0.8rem' }}>ליקויים עיקריים</h3>
              <ul className="flex flex-col gap-2">
                  {(sec.deficiencies || []).map((item, idx) => (
                      <li key={idx} className="flex items-center justify-end gap-2">
                          <p className="text-slate-700 font-black leading-snug" style={{ fontSize: `${0.95 * dataFontScale}rem` }}>{item}</p>
                          <span className="font-black italic text-slate-200 leading-none" style={{ fontSize: `${1.5 * dataFontScale}rem` }}>{(idx + 1).toString().padStart(2, '0')}</span>
                      </li>
                  ))}
              </ul>
          </div>
      </div>
    </div>
  );

  const renderAnomaly = (sec: AnomalySection) => (
    <div className="w-full text-right flex flex-col gap-3" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
      {(sec.items || []).map((item, i) => {
        const isExpanded = expandedAnomalyId === item.id;
        return (
          <div 
            key={item.id} 
            onClick={(e) => { e.stopPropagation(); setExpandedAnomalyId(isExpanded ? null : item.id); }}
            className={`transition-all duration-300 border border-slate-100 shadow-sm p-4 ${
                isExpanded ? 'bg-white rounded-[1.2rem] mb-3 shadow-xl' : 'bg-slate-50/50 hover:bg-white rounded-[30px] cursor-pointer'
            }`}
          >
            <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4">
                <div className="flex shrink-0 gap-1 order-2 sm:order-1">
                    {[1,2,3,4,5].map(dot => (
                        <div key={dot} className={`rounded-full ${dot <= item.riskLevel ? 'bg-rose-500' : 'bg-slate-200'}`} style={{ width: '0.4rem', height: '1.2rem' }}></div>
                    ))}
                </div>
                <div className="flex-1 flex flex-col min-w-0 order-3 sm:order-2">
                    <h3 className="font-black text-slate-800" style={{ fontSize: `${1 * fontScale}rem` }}>{item.title}</h3>
                    <div className="flex items-center justify-end mt-1 gap-3">
                        <span className="font-bold text-indigo-500 uppercase whitespace-nowrap" style={{ fontSize: `${10 * labelFontScale}px` }}>{item.status}</span>
                        <span className="font-black text-slate-400 uppercase whitespace-nowrap" style={{ fontSize: `${10 * labelFontScale}px` }}>| {item.department}</span>
                    </div>
                </div>
                <span className="font-black text-slate-200 italic shrink-0 leading-none order-1 sm:order-3" style={{ fontSize: `${2.2 * dataFontScale}rem` }}>{(i + 1).toString().padStart(2, '0')}</span>
            </div>

            {isExpanded && (
                <div className="border-t border-slate-100 animate-in fade-in duration-300 mt-4 pt-4 flex flex-col gap-4">
                    <div className="space-y-1">
                        <span className="font-black text-indigo-500 uppercase block" style={{ fontSize: `${11 * labelFontScale}px` }}>REPORT_DETAIL</span>
                        <p className="text-slate-700 font-bold leading-relaxed" style={{ fontSize: `${1 * dataFontScale}rem` }}>{item.detailedReport || 'אין פירוט.'}</p>
                    </div>
                    <div className="bg-rose-50/30 rounded-xl p-4 mt-2 flex flex-col gap-1 border border-rose-100">
                        <span className="font-black text-rose-500 uppercase block" style={{ fontSize: `${10 * labelFontScale}px` }}>RISK_ANALYSIS</span>
                        <p className="text-slate-600 italic font-bold" style={{ fontSize: `${0.9 * dataFontScale}rem` }}>{item.riskAnalysis}</p>
                    </div>
                </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderKPI = (sec: KPISection) => (
    <div className="flex flex-wrap w-full gap-4">
      {sec.metrics.map((m, i) => {
        const deltaStr = m.delta?.toString() || '';
        const isNegative = deltaStr.includes('-');
        const isPositive = deltaStr.length > 0 && !isNegative;
        const arrow = isNegative ? '↓' : (isPositive ? '↑' : '');
        const deltaColor = isNegative ? 'text-rose-600' : 'text-emerald-600';

        return (
          <div key={i} className="flex-grow basis-[200px] bg-white rounded-[1.2rem] text-right border border-slate-100 flex flex-col justify-center p-6 shadow-sm hover:shadow-md transition-shadow">
            <p className="font-black text-slate-400 uppercase truncate" style={{ fontSize: `${12 * labelFontScale}px`, marginBottom: '0.5rem' }}>{m.label}</p>
            <div className="flex items-baseline justify-between overflow-hidden gap-2">
              <span className="font-black truncate" style={{ fontSize: `${2.2 * dataFontScale}rem`, color: textColor }}>{m.value}</span>
              {m.delta && (
                <span className={`font-black shrink-0 flex items-center gap-1 ${deltaColor}`} style={{ fontSize: `${11 * labelFontScale}px` }}>
                  <span>{arrow}</span>
                  <span>{m.delta}</span>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderChart = (sec: DataChartSection) => {
    const availableKeys = (sec.seriesKeys || []).filter(key => sec.data.some(d => d[key] !== undefined));
    return (
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          {['pie', 'donut'].includes(sec.chartKind) ? (
            <PieChart>
                <Pie 
                  data={sec.data} 
                  nameKey={sec.xKey || 'x'} 
                  dataKey={availableKeys[0] || 'y'} 
                  cx="50%" cy="50%" 
                  innerRadius={sec.chartKind === 'donut' ? '50%' : 0} 
                  outerRadius="80%" 
                  label={({ name }) => <tspan style={{ fontSize: `${12 * labelFontScale}px`, fontWeight: 900 }}>{name}</tspan>}
                >
                    {sec.data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: `${12 * labelFontScale}px`, fontWeight: '900' }} />
            </PieChart>
          ) : (
            <BarChart data={sec.data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey={sec.xKey || 'x'} axisLine={false} tickLine={false} tick={{ fontSize: 11 * labelFontScale, fontWeight: '900', fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 * labelFontScale, fontWeight: '900', fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ paddingBottom: '10px', fontWeight: '900', fontSize: `${12 * labelFontScale}px` }} />
                {availableKeys.map((key, i) => (
                    sec.chartKind === 'line' 
                    ? <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 5 }} />
                    : <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} barSize={32} />
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
        noPadding={['summary_evaluation', 'kpi', 'anomaly', 'pasted_graphic'].includes(section.type)}
        pill={section.type === 'date_picker'}
        className={section.type === 'summary_evaluation' ? 'bg-[#fcfdff]' : ''}
        type={section.type}
    >
        <div className="flex flex-col h-full w-full" style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
            {section.title && !['date_picker', 'anomaly', 'pasted_graphic'].includes(section.type) && (
              <h2 className="tracking-tighter leading-tight border-r-4 border-[#002d72] pr-4 font-black shrink-0 text-right" style={{ color: textColor, fontSize: `${1.3 * fontScale}rem`, marginBottom: '1.2rem' }}>{section.title}</h2>
            )}
            
            {section.type === 'summary_evaluation' && renderSummaryEvaluation(section as SummaryEvaluationSection)}
            {section.type === 'kpi' && renderKPI(section as KPISection)}
            {section.type === 'data_chart' && renderChart(section as DataChartSection)}
            {section.type === 'anomaly' && renderAnomaly(section as AnomalySection)}

            {section.type === 'table' && (
              <div className="overflow-x-auto rounded-[1rem] border border-slate-100 bg-white flex-1 shadow-inner">
                <table className="w-full text-right border-collapse min-w-[500px]">
                  <thead className="bg-[#002d72] text-white sticky top-0 z-10">
                    <tr>{(section as TableSection).headers.map((h, i) => <th key={i} className="font-black uppercase text-right p-4" style={{ fontSize: `${12 * labelFontScale}px` }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {(section as TableSection).rows.map((row, ri) => (
                      <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        {row.map((cell, ci) => <td key={ci} className="border-b border-slate-100 font-bold text-[#002d72] p-4" style={{ fontSize: `${1 * dataFontScale}rem` }}>{cell}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {section.type === 'text' && <div className="whitespace-pre-wrap leading-relaxed font-bold text-right text-[#002d72]" style={{ fontSize: `${1.1 * dataFontScale}rem` }}>{(section as TextSection).content}</div>}

            {section.type === 'date_picker' && (
              <div className="flex items-center gap-4 px-8 py-3">
                <div className="bg-blue-50 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 w-14 h-14 shadow-sm">
                  <span className="text-3xl">📅</span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="font-black text-slate-400 uppercase tracking-widest" style={{ fontSize: `${11 * labelFontScale}px` }}>{(section as DatePickerSection).label}</span>
                  <span className="font-black text-[#002d72] tracking-tighter" style={{ fontSize: `${2 * dataFontScale}rem` }}>{(section as DatePickerSection).date.split('-').reverse().join('/')}</span>
                </div>
              </div>
            )}

            {section.type === 'pasted_graphic' && (section as PastedGraphicSection).src && (
              <div className="w-full relative flex-1 min-h-0 bg-slate-50 rounded-[1rem] overflow-hidden">
                <img src={(section as PastedGraphicSection).src} className="w-full h-full object-contain" alt="Graphic" />
                {(section as PastedGraphicSection).caption && <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full font-bold shadow-lg border border-white/50" style={{ fontSize: `${12 * labelFontScale}px` }}>{(section as PastedGraphicSection).caption}</div>}
              </div>
            )}
        </div>
    </Card>
  );
};
