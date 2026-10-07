# דובדבוט 🍒 — יועץ עסקי בכיס

Next.js 15 · Gemini · Supabase (pgvector) · Make · Vercel

## מה יש פה
| נתיב | מה זה |
|---|---|
| `/` | דף נחיתה + הרשמה (שם, מייל, נייד, אישור תנאים, הסכמה **נפרדת** לדיוור) |
| `/chat` | הצ'אט: 5 כלים (תחזית, תוכנית עבודה, תסריט מכירה, היתכנות, מאמן התנגדויות) + שאלה חופשית |
| `/privacy`, `/terms` | טיוטות משפטיות (להעביר לעו"ד, יש שדות [להשלמה]) |
| `/api/chat` | RAG על החומרים של ניר → Gemini בסטרימינג → זיהוי רגע ל-CTA |
| `/api/lead` | בקשת פגישה → סיכום שיחה ע"י AI → Supabase + Make (Sheets / מייל / Fireberry) |
| `/preview` | תצוגת עיצוב עם נתוני דמה (חסום בפרודקשן) |

## הקמה
1. **Supabase** – פרויקט חדש (אזור eu-central-1). להריץ את `supabase/migrations/001_init.sql` ב-SQL Editor.
2. **Gemini** – מפתח מ-Google AI Studio.
3. **Vercel** – לחבר את הריפו ולהגדיר את המשתנים מ-`.env.example`:
   `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (מחרוזת אקראית ארוכה), `MAKE_LEAD_WEBHOOK_URL`, `MAKE_SIGNUP_WEBHOOK_URL`.
4. **ידע** – להוריד את תיקיית הדרייב לתוך `knowledge/` ואז:
   ```
   npm run ingest:drive -- --dry   # בדיקה שהעברית יוצאת תקינה
   npm run ingest:drive
   npm run ingest:youtube          # צריך YOUTUBE_API_KEY
   ```
   תוכניות עבודה של לקוחות (ניב כרמל, רונישופ, ירון קטן, מיתר, מכללה, BIG STOCK) **לא נכנסות** – יש בהן מידע של לקוחות אמיתיים.

## Make – תרחיש לידים (webhook אחד)
Webhook → Router:
1. **Google Sheets** – Add row (טאב "פגישות דובדבוט"): תאריך, סוג פגישה, שם, נייד, מייל, מתי נוח, הערה, `ai_summary`, `trigger`, UTM.
2. **Email** – לצוות (nir@, omern@, nadvab@, yarinb@ ו-evyatarbp@). נושא: `🍒 ליד חם מדובדבוט – {{meeting_type}} – {{full_name}}`. גוף: הסיכום + כפתור חיוג `tel:{{phone_intl}}`.
3. **Fireberry** – Create record (Lead/Account): שם, טלפון, מייל, מקור = "דובדבוט", תיאור = `ai_summary`.

תרחיש שני (signup): כל נרשם → Sheets טאב "נרשמים" + Fireberry כ-Lead קר. **רק אם `marketing_consent = true`** להכניס לרשימות הדיוור.

> עד ההשקה כל הבדיקות הולכות רק ל-omern@rnd.org.il.

## לולאת הלמידה
- `messages.top_similarity` + view `knowledge_gaps` → שאלות שאין להן מקור אצל ניר. דוח שבועי → ניר מקליט תשובה → `scripts/add-golden.ts`.
- `golden_answers` → תשובות שניר אישר נשלפות אוטומטית ומשמשות דוגמה לסגנון.
- `feedback` (👍/👎) → מה לשפר בפרומפט.
- `events` + view `funnel_daily` → CTA הוצג / נלחץ / נסגר / ליד. מכיילים את הטריגרים לפי מה שממיר.
- `users.profile` → דובדבוט לומד את העסק של כל משתמש וזוכר אותו בשיחה הבאה.
