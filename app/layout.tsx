import type { Metadata } from "next";
import "./globals.css"; // Global styles

export const metadata: Metadata = {
  title: "ИИ Коллектив | ИИ-навигатор по данным вашей компании",
  description:
    "ИИ Коллектив объединяет разрозненные знания в едином окне. Он понимает смысл ваших документов и переписки, избавляя команду от бесконечного поиска и рутины.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body
        className="font-sans bg-slate-50 text-slate-900 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
