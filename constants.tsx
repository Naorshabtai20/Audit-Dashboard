
import { Report } from './types';

export const INITIAL_REPORT: Report = {
    sections: [
        {
            id: "sec-1",
            type: "text",
            title: "דו\"ח ביצועים שנתי - 2024",
            content: "ברוכים הבאים למערכת הפקת הדו\"חות החדשה. כאן תוכלו לעצב מסמכים מקצועיים בלחיצת כפתור ולגרור אותם כדי לסדר את המבנה.",
            styles: { colSpan: 12, fontScale: 1.2, alignment: 'right', color: '#1e293b', fontWeight: '800' }
        },
        {
            id: "sec-2",
            type: "data_chart",
            title: "התפלגות מכירות חודשית",
            chartKind: "bar",
            data: [
                { x: "ינואר", y: 400 },
                { x: "פברואר", y: 300 },
                { x: "מרץ", y: 600 },
                { x: "אפריל", y: 800 }
            ],
            styles: { colSpan: 6, fontScale: 1, alignment: 'center' }
        },
        {
            id: "sec-3",
            type: "text",
            title: "ניתוח מהיר",
            content: "הגרף משמאל מציג צמיחה עקבית ברבעון הראשון. אנחנו צופים המשך מגמה חיובית גם במאי ויוני.",
            styles: { colSpan: 6, fontScale: 1, alignment: 'right' }
        }
    ]
};
