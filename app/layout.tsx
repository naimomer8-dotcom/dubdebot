import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Duvdevani Platform | הפלטפורמה להצלחה בחיים ובעסקים",
  description:
    "Duvdevani Platform – הפלטפורמה להצלחה בחיים ובעסקים מבית קבוצת דובדבני. ניר דובדבני זמין לך 24/6: תחזיות עסקיות, תוכניות עבודה, תסריטי מכירה ובדיקות היתכנות – מבוסס על השיטה של ניר דובדבני.",
  openGraph: {
    title: "Duvdevani Platform – הפלטפורמה להצלחה בחיים ובעסקים",
    description: "החזון שלי: שלא יהיה עסק בישראל בלי Duvdevani Platform.",
    locale: "he_IL",
    type: "website",
  },
  icons: { icon: "/favicon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#070708",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Karantina:wght@400;700&family=Assistant:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
