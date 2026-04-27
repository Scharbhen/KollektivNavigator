import type { Metadata } from "next";
import localFont from "next/font/local";
import Script from "next/script";
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
  title: "ИИ Коллектив | Конец ручного ввода и сверок документов",
  description:
    "ИИ Коллектив понимает входящие документы, извлекает реквизиты, заполняет карточки и помогает убрать ручной ввод, сверки и поиск по папкам.",
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
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
            (function(m,e,t,r,i,k,a){
              m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
              m[i].l=1*new Date();
              for (var j = 0; j < document.scripts.length; j++) {
                if (document.scripts[j].src === r) { return; }
              }
              k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
            })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=107738575', 'ym');

            ym(107738575, 'init', {
              ssr: true,
              webvisor: true,
              clickmap: true,
              ecommerce: 'dataLayer',
              referrer: document.referrer,
              url: location.href,
              accurateTrackBounce: true,
              trackLinks: true
            });
          `}
        </Script>
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/107738575"
              style={{ position: "absolute", left: "-9999px" }}
              alt=""
            />
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
