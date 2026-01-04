
export type SectionType = "text" | "pasted_graphic" | "data_chart" | "table" | "kpi" | "summary_evaluation";

export interface SectionStyles {
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

export interface SectionBase {
    id: string;
    type: SectionType;
    title?: string;
    visible?: boolean;
    styles?: SectionStyles;
}

export interface TextSection extends SectionBase {
    type: "text";
    content: string;
}

export interface PastedGraphicSection extends SectionBase {
    type: "pasted_graphic";
    src: string;
    caption?: string;
}

export interface DataChartSection extends SectionBase {
    type: "data_chart";
    chartKind: "line" | "bar" | "area" | "pie" | "donut" | "radar";
    data: Array<Record<string, any>>;
    xKey?: string;
    seriesKeys?: string[];
}

export interface TableSection extends SectionBase {
    type: "table";
    headers: string[];
    rows: string[][];
}

export interface KPIMetric {
    label: string;
    value: string | number;
    delta?: string | number;
    trend?: "up" | "down" | "flat";
}

export interface KPISection extends SectionBase {
    type: "kpi";
    metrics: KPIMetric[];
}

export interface SummaryEvaluationSection extends SectionBase {
    type: "summary_evaluation";
    briefingText: string;
    score: number; // 1 to 5
    scoreLabel: string;
    recommendations: string[];
    deficiencies: string[];
}

export type Section = TextSection | PastedGraphicSection | DataChartSection | TableSection | KPISection | SummaryEvaluationSection;

export type Report = {
    sections: Section[];
};
