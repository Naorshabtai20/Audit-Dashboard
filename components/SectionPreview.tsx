
import React from 'react';
import { Section, TextSection, DataChartSection, TableSection, KPISection, PastedGraphicSection, SummaryEvaluationSection, DatePickerSection } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
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
}> = ({ children, styles, isSelected, onDelete, onSelect, noPadding, isDynamicHeight, pill }) => (
  <div 
    onClick={(e) => { if(onSelect) { e.stopPropagation(); onSelect(); } }}
    className={`group transition-all duration-300 relative w-full flex flex-col overflow-hidden ${
        pill ? 'rounded-[100px]' : 'rounded-[2.5rem]'
    } ${
        isSelected 
        ? 'bg-white shadow-[0_40px_100px_-20px_rgba(0,45,114,0.15)] border-[#002d72] scale-[1.01] z-30 border' 
        : 'bg-white shadow-lg border border-slate-100 hover:border-slate-200 z-10 hover:shadow-xl'
    } ${!onSelect ? 'cursor-default' : 'cursor-pointer'}`}
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
    
    <div className={`${noPadding ? 'p-0' : 'p-10'} flex-1 flex flex-col relative h-full overflow-visible justify-center`}>
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
  const textColor = styles.color || '#002d72';

  const renderDatePicker = (sec: DatePickerSection) => {
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const displayDate = sec.date ? sec.date.split('-').reverse().join('/') : 'בחר תאריך';
    
    return (
      <div className="flex items-center gap-8 px-6">
        <div className="w-24 h-24 bg-blue-50 hover:bg-blue-100 transition-colors rounded-[2rem] flex items-center justify-center shadow-inner shrink-0">
          <span className="text-5xl">{sec.icon || '📅'}</span>
        </div>

        <div className="flex flex-col text-right">
          <span 
            className="font-black uppercase tracking-[0.2em] mb-2 opacity-60"
            style={{ fontSize: `${11 * labelFontScale}px`, color: textColor }}
          >
            {sec.label || 'מועד ביצוע סופי'}
          </span>
          <span 
            className="font-black tracking-tighter leading-none"
            style={{ fontSize: `${2.5 * dataFontScale}rem`, color: textColor }}
          >
            {displayDate}
          </span>
        </div>
      </div>
    );
  };

  const renderSummaryEvaluation = (sec: SummaryEvaluationSection) => (
    <div className="flex flex-col gap-12 w-full h-full bg-[#f8fafc] p-10 md:p-16">
        {/* Upper Part: Briefing and Score */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
            {/* Briefing Card */}
            <div className="bg-white rounded-[3rem] p-12 md:p-16 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden">
                <div className="absolute top-12 right-0 w-2.5 h-24 bg-orange-400 rounded-l-full"></div>
                <p className="text-[#f59e0b] text-[11px] font-black uppercase tracking-[0.25em] mb-8">SUMMARY_BRIEFING</p>
                <div className="text-[#002d72] italic text-2xl md:text-3xl font-semibold leading-[1.8] pr-6">
                    "{sec.briefingText}"
                </div>
                <div className="mt-auto pt-10">
                    <div className="w-16 h-1.5 bg-orange-400 rounded-full"></div>
                </div>
            </div>

            {/* Score Card */}
            <div className="bg-white rounded-[3rem] p-12 md:p-16 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                <div className="flex gap-3 mb-10">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-2.5 w-14 rounded-full transition-all duration-700 ${i <= sec.score ? 'bg-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]' : 'bg-slate-100'}`}></div>
                    ))}
                </div>
                <div className="text-rose-500 text-8xl md:text-9xl font-black mb-4 tracking-tighter">
                    {sec.score}/5
                </div>
                <div className="text-rose-400 text-2xl font-extrabold mb-12 tracking-wide">
                    {sec.scoreLabel}
                </div>
                <div className="pt-8 border-t border-slate-50 w-full">
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">COMPLIANCE MAGNITUDE VERIFIED</p>
                </div>
            </div>
        </div>

        {/* Lower Part: Recommendations and Deficiencies */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            {/* Recommendations - Green */}
            <div className="bg-[#f0fdf4] rounded-[3rem] p-12 md:p-16 border border-emerald-100 shadow-sm h-full">
                <div className="flex items-center gap-5 mb-12">
                    <div className="w-4 h-4 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
                    <h3 className="text-emerald-600 font-black text-sm uppercase tracking-widest">המלצות הביקורת</h3>
                </div>
                <ul className="space-y-8">
                    {sec.recommendations.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-6 group">
                            <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0 group-hover:bg-emerald-500 transition-all">
                                <span className="text-emerald-500 group-hover:text-white font-black text-xl leading-none transition-all">✓</span>
                            </div>
                            <span className="text-slate-700 font-bold text-lg leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Deficiencies - Red */}
            <div className="bg-[#fff1f2] rounded-[3rem] p-12 md:p-16 border border-rose-100 shadow-sm h-full">
                <div className="flex items-center gap-5 mb-12">
                    <div className="w-4 h-4 bg-rose-500 rounded-full shadow-[0_0_15px_rgba(244,63,94,0.5)]"></div>
                    <h3 className="text-rose-600 font-black text-sm uppercase tracking-widest">ליקויים עיקריים</h3>
                </div>
                <ul className="space-y-8">
                    {sec.deficiencies.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-8">
                            <span className="text-rose-200 font-black italic text-4xl leading-none shrink-0 tracking-tighter">
                                {String(idx + 1).padStart(2, '0')}
                            </span>
                            <span className="text-slate-700 font-bold text-lg leading-relaxed">{item}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    </div>
  );

  const renderKPI = (sec: KPISection) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 flex-1 items-center">
      {sec.metrics.map((m, i) => (
        <div key={i} className="bg-slate-50 p-8 rounded-[2rem] text-right shadow-sm border border-slate-100 flex flex-col justify-center">
          <p 
            className="font-extrabold text-slate-400 uppercase tracking-widest mb-2"
            style={{ fontSize: `${10 * labelFontScale}px` }}
          >
            {m.label}
          </p>
          <div className="flex items-baseline justify-between gap-4">
            <span 
                className="font-extrabold leading-tight tracking-tighter"
                style={{ fontSize: `${2.4 * dataFontScale}rem`, color: textColor }}
            >
                {m.value}
            </span>
            {m.delta && (
              <div className="flex items-center font-bold" style={{ fontSize: `${12 * dataFontScale}px`, color: m.trend === 'down' ? '#ef4444' : '#10b981' }}>
                <span className="ml-1">{m.trend === 'down' ? '▼' : '▲'}</span>
                <span>{m.delta}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderTable = (sec: TableSection) => {
    if (!sec.headers || sec.headers.length === 0) return null;
    return (
      <div className="overflow-x-auto rounded-[1.5rem] border border-slate-100 mt-6 shadow-sm bg-white flex-1 custom-scrollbar">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-[#002d72] text-white">
              {sec.headers.map((h, i) => (
                <th 
                  key={i} 
                  className="p-4 font-extrabold uppercase tracking-wider"
                  style={{ fontSize: `${10 * labelFontScale}px` }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sec.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, ci) => (
                    <td 
                        key={ci} 
                        className="p-4 border-b border-slate-100 font-semibold"
                        style={{ fontSize: `${14 * dataFontScale}px`, color: textColor }}
                    >
                        {cell}
                    </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderGraphic = (sec: PastedGraphicSection) => (
    <div className="flex-1 flex flex-col items-center justify-center overflow-hidden mt-4">
      {sec.src ? (
        <img src={sec.src} alt={sec.caption || ''} className="max-w-full max-h-full object-contain rounded-2xl" />
      ) : (
        <div className="text-slate-300 font-bold border-4 border-dashed rounded-3xl p-10">הדבק תמונה בעורך</div>
      )}
      {sec.caption && <p className="mt-4 text-xs font-bold text-slate-400 italic">{sec.caption}</p>}
    </div>
  );

  const renderChart = (sec: DataChartSection) => {
    const { data = [], seriesKeys = [], xKey = 'x' } = sec;
    const { showLegend = true, showGrid = true } = styles;

    if (data.length === 0) return (
      <div className="flex-1 flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-50 rounded-[3rem] mt-6">
        <span className="text-4xl mb-4">📊</span>
        <p className="font-bold">הזן נתונים</p>
      </div>
    );

    return (
      <div className="mt-8 flex-1 min-h-0 w-full overflow-hidden">
        <ResponsiveContainer width="100%" height="100%">
          {sec.chartKind === 'pie' || sec.chartKind === 'donut' ? (
            <PieChart>
              <Pie
                data={data}
                nameKey={xKey}
                dataKey={seriesKeys[0] || 'y'}
                cx="50%" cy="50%"
                innerRadius={sec.chartKind === 'donut' ? '60%' : 0}
                outerRadius="85%"
                paddingAngle={5}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
              </Pie>
              <Tooltip />
              {showLegend && <Legend verticalAlign="bottom" height={36}/>}
            </PieChart>
          ) : (
            <React.Fragment>
              {sec.chartKind === 'bar' ? (
                <BarChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
                  <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  {showLegend && <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold'}}/>}
                  {seriesKeys.map((key, i) => (
                    <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[8, 8, 0, 0]} barSize={seriesKeys.length > 3 ? 12 : 35} />
                  ))}
                </BarChart>
              ) : (
                <LineChart data={data} margin={{ top: 20, right: 20, left: 10, bottom: 20 }}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />}
                  <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                  {showLegend && <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold'}}/>}
                  {seriesKeys.map((key, i) => (
                    <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={5} dot={{ r: 5, strokeWidth: 3, fill: '#fff' }} activeDot={{ r: 8 }} />
                  ))}
                </LineChart>
              )}
            </React.Fragment>
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
        noPadding={section.type === 'summary_evaluation'}
        isDynamicHeight={section.type === 'summary_evaluation' || section.type === 'date_picker'}
        pill={section.type === 'date_picker'}
    >
        {section.title && section.type !== 'summary_evaluation' && section.type !== 'date_picker' && (
          <h2 className="mb-6 tracking-tight leading-tight border-r-8 border-[#002d72] pr-6 font-extrabold shrink-0" style={{ color: textColor, fontSize: `${1.6 * fontScale}rem`, fontWeight: styles.fontWeight || '800' }}>
            {section.title}
          </h2>
        )}
        
        {section.type === 'summary_evaluation' && (
            <div className="flex flex-col h-full overflow-visible">
                <h1 className="text-center text-7xl md:text-8xl font-black text-[#001b44] py-20 tracking-tighter shrink-0">הערכה מסכמת</h1>
                {renderSummaryEvaluation(section as SummaryEvaluationSection)}
            </div>
        )}

        {section.type === 'date_picker' && renderDatePicker(section as DatePickerSection)}

        {section.type === 'text' && (
          <div className="whitespace-pre-wrap leading-relaxed opacity-95 pr-2 flex-1 overflow-y-auto custom-scrollbar font-semibold" style={{ color: textColor, fontSize: `${1 * fontScale}rem`, lineHeight: '1.6' }}>
            {(section as TextSection).content}
          </div>
        )}
        {section.type === 'kpi' && renderKPI(section as KPISection)}
        {section.type === 'data_chart' && renderChart(section as DataChartSection)}
        {section.type === 'table' && renderTable(section as TableSection)}
        {section.type === 'pasted_graphic' && renderGraphic(section as PastedGraphicSection)}
    </Card>
  );
};
