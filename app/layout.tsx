import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "דובדבוט | יועץ עסקי בכיס – קבוצת דובדבני",
  description:
    "דובדבוט – היועץ העסקי האישי שלך מבית קבוצת דובדבני. תחזיות עסקיות, תוכניות עבודה, תסריטי מכירה ובדיקות היתכנות – מבוסס על השיטה של ניר דובדבני.",
  openGraph: {
    title: "דובדבוט – יועץ עסקי בכיס",
    description: "החזון שלי: שלא יהיה עסק בישראל שאין לו דובדבוט.",
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
          href="https://fonts.googleapis.com/css2?family=Frank+Ruhl+Libre:wght@300;400;500;700&family=Heebo:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
