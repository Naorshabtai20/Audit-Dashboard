
export type SectionType = "text" | "graphic" | "chart" | "table" | "kpi" | "summary_evaluation" | "date" | "anomaly";

export interface SectionStyles
{
    colSpan?: number; // 1-12 columns in grid
    height?: number; // explicit height in pixels
    fontScale?: number; // 0.5-6.0 (Headers/Titles)
    dataFontScale?: number; // 0.5-5.0 (KPI Values / Table Cells)
    labelFontScale?: number; // 0.5-3.0 (KPI Labels / Small text)
    alignment?: 'right' | 'center' | 'left';
    color?: string;
    backgroundColor?: string;
    showLegend?: boolean;
    showGrid?: boolean;
    fontWeight?: string;
}

export interface SectionBase
{
    id: string;
    type: SectionType;
    title?: string;
    visible?: boolean;
    styles?: SectionStyles;
}

export interface TextSection extends SectionBase
{
    type: "text";
    content: string;
}

export interface GraphicSection extends SectionBase
{
    type: "graphic";
    src: string;
}

export interface ChartSection extends SectionBase
{
    type: "chart";
    chartKind: "line" | "bar" | "area" | "pie" | "donut" | "radar";
    data: Array<Record<string, any>>;
    xKey?: string;
    seriesKeys?: string[];
}

export interface TableSection extends SectionBase
{
    type: "table";
    headers: string[];
    rows: string[][];
}

export interface KPIMetric
{
    label: string;
    value: string | number;
    delta?: string | number;
    trend?: "up" | "down" | "flat";
}

export interface KPISection extends SectionBase
{
    type: "kpi";
    metrics: KPIMetric[];
}

export interface SummaryEvaluationSection extends SectionBase
{
    type: "summary_evaluation";
    briefingText: string;
    score: number;
    scoreLabel: string;
    footerLabel?: string;
    recommendations: string[];
    deficiencies: string[];
}

export interface DateSection extends SectionBase
{
    type: "date";
    date: string;
    label: string;
    icon?: string;
}

export interface AnomalyItem
{
    id: string;
    title: string;
    department: string; // "גורם מבוקר"
    status: string;
    riskLevel: number; // 1-5 scale
    riskAnalysis: string;
    detailedReport: string;
    internalRef: string;
    protocolStatus: string;
    link?: string;
}

export interface AnomalySection extends SectionBase
{
    type: "anomaly";
    items: AnomalyItem[];
}

export type Section = TextSection | GraphicSection | ChartSection | TableSection | KPISection | SummaryEvaluationSection | DateSection | AnomalySection;

export type ReportTab = {
    title: string; // tab title
    icon?: string; // tab icon
    subTitles?: string; //sub title under the tab name
    sections: Section[]; // tab content
}

export type Report = {
    tabs: ReportTab[];
};
