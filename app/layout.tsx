import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css"; // Global styles

const inter = localFont({
  src: [
    { path: "./fonts/Inter-100.ttf", weight: "100", style: "normal" },
    { path: "./fonts/Inter-200.ttf", weight: "200", style: "normal" },
    { path: "./fonts/Inter-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Inter-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Inter-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/Inter-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/Inter-700.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Inter-800.ttf", weight: "800", style: "normal" },
    { path: "./fonts/Inter-900.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const spaceGrotesk = localFont({
  src: [
    { path: "./fonts/SpaceGrotesk-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/SpaceGrotesk-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/SpaceGrotesk-500.ttf", weight: "500", style: "normal" },
    { path: "./fonts/SpaceGrotesk-600.ttf", weight: "600", style: "normal" },
    { path: "./fonts/SpaceGrotesk-700.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-display",
  display: "swap",
});

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
    <html lang="ru" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body
        className="font-sans bg-slate-50 text-slate-900 antialiased"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
