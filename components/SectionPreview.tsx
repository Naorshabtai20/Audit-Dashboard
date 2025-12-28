
import React from 'react';
import { Section, TextSection, DataChartSection, TableSection, KPISection, PastedGraphicSection } from '../types';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area,
  Legend
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6366f1', '#f97316', '#a855f7'];

const Card: React.FC<{ 
    children: React.ReactNode; 
    styles: any; 
    isSelected?: boolean;
    onDelete?: () => void;
    onSelect?: () => void;
}> = ({ children, styles, isSelected, onDelete, onSelect }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
    className={`group rounded-[2.5rem] border transition-all duration-300 relative w-full flex flex-col overflow-hidden ${
        isSelected 
        ? 'bg-white shadow-[0_25px_70px_-15px_rgba(59,130,246,0.35)] border-blue-500 scale-[1.01] z-30' 
        : 'bg-white shadow-xl border-slate-100 hover:border-slate-300 z-10 hover:shadow-2xl'
    }`}
    style={{ 
        minHeight: styles.height ? `${styles.height}px` : 'auto',
        height: styles.height ? `${styles.height}px` : 'auto',
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
    
    {isSelected && (
      <div className="absolute top-4 left-4 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg z-50">
        עריכה פעילה
      </div>
    )}

    <div className="p-8 md:p-10 flex-1 flex flex-col relative h-full">
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
  const textColor = styles.color || '#1e293b';

  const renderKPI = (sec: KPISection) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4 flex-1 items-center">
      {sec.metrics.map((m, i) => (
        <div key={i} className="bg-slate-50/50 border border-slate-100 p-6 rounded-[2rem] text-right shadow-sm flex flex-col justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{m.label}</p>
          <div className="flex items-baseline justify-between gap-4">
            <span 
                className="font-black leading-tight"
                style={{ fontSize: `${2.2 * dataFontScale}rem`, color: textColor }}
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
            <tr className="bg-slate-900 text-white">
              {sec.headers.map((h, i) => <th key={i} className="p-4 text-[10px] font-black uppercase tracking-wider">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {sec.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}>
                {row.map((cell, ci) => (
                    <td 
                        key={ci} 
                        className="p-4 border-b border-slate-100 font-medium"
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
        <img src={sec.src} alt={sec.caption || ''} className="max-w-full max-h-full object-contain rounded-2xl shadow-lg" />
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
        <p className="font-bold">הדבק נתונים (Ctrl+V)</p>
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
                    <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[6, 6, 0, 0]} barSize={seriesKeys.length > 3 ? 12 : 30} />
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
                    <Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} strokeWidth={4} dot={{ r: 4 }} activeDot={{ r: 7 }} />
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
    <Card styles={styles} isSelected={isSelected} onDelete={() => onDelete(section.id)} onSelect={() => onSelect(section.id)}>
        {section.title && (
          <h2 className="mb-4 tracking-tight leading-tight border-r-4 border-blue-600 pr-5 font-black shrink-0" style={{ color: textColor, fontSize: `${1.5 * fontScale}rem`, fontWeight: styles.fontWeight }}>
            {section.title}
          </h2>
        )}
        {section.type === 'text' && (
          <div className="whitespace-pre-wrap leading-relaxed opacity-90 pr-2 flex-1 overflow-y-auto custom-scrollbar" style={{ color: textColor, fontSize: `${1 * fontScale}rem`, fontWeight: styles.fontWeight }}>
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
