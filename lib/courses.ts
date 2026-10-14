/** The platform library shown in "הקורסים שלי". Ids are Schooler course ids (teacher 430). Sales first; מקצוען בנדל״ן is a bonus (opening it flags a lead for the investment academy). */
export type CourseKind = "course" | "book";
export type Course = { id: number; kind: CourseKind; title: string; blurb: string; tag: string; bonus?: boolean };

export const LIBRARY: Course[] = [
  { id: 50, kind: "course", tag: "מכירות", title: "פשוט למכור הרבה יותר", blurb: "קורס המכירות של ניר, משלב החיבור ועד הטיפול בהתנגדויות." },
  { id: 6527, kind: "course", tag: "ניהול", title: "(לא) פשוט להיות עסק אלפא", blurb: "שיטת האלפא לעסקים: מבנה, תכנון וצמיחה." },
  { id: 1366, kind: "course", tag: "מכירות", title: "שפת גוף של כוכב מכירות", blurb: "מה הגוף שלך אומר ללקוח לפני שפתחת את הפה." },
  { id: 110990, kind: "course", tag: "כסף", title: "מקצוענים בכסף", blurb: "ניהול כסף, תזרים והחלטות פיננסיות של בעל עסק." },
  { id: 110992, kind: "course", tag: "AI", title: "מקצוען ב-AI", blurb: "איך להכניס בינה מלאכותית לעבודה היומיומית של העסק." },
  { id: 116394, kind: "course", tag: "אסטרטגיה", title: "המבוא לאסטרטגיית הון", blurb: "איך בונים הון ולא רק הכנסה: מעבר מעבודה לנכסים." },
  { id: 10426, kind: "course", tag: "מוצר דיגיטלי", title: "פשוט לעשות קורס / מוצר דיגיטלי שיימכר", blurb: "מרעיון למוצר דיגיטלי שאנשים קונים." },
  { id: 16892, kind: "course", tag: "תודעה", title: "קורס NLP עסקי", blurb: "כלי NLP לתקשורת, שכנוע וניהול עצמי בעסק." },
  { id: 111779, kind: "course", tag: "נדל״ן", title: "מקצוען בנדל״ן", bonus: true, blurb: "הכשרה מקצועית לעולם הנדל״ן וליווי משקיעים." },
  { id: 48020, kind: "book", tag: "ספרים", title: "3 הספרים של ניר דובדבני", blurb: "המארז הדיגיטלי של שלושת הספרים." },
  { id: 33704, kind: "book", tag: "ספר", title: "להיות אלפא בעסקים", blurb: "המהדורה הדיגיטלית." },
  { id: 33706, kind: "book", tag: "ספר", title: "המחיר למשתפן", blurb: "המהדורה הדיגיטלית." },
  { id: 2405, kind: "book", tag: "ספר", title: "בסוף יצא לך ארנב", blurb: "המהדורה הדיגיטלית." },
  { id: 93621, kind: "book", tag: "ספר", title: "האדם מחפש עצמאות", blurb: "המהדורה הדיגיטלית." },
];
