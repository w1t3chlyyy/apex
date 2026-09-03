import type { Metadata } from "next";
import { Montserrat, Unbounded } from "next/font/google";
import Script from "next/script";
import TelegramMiniAppProvider from "@/components/TelegramMiniAppProvider";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Внедряй своего AI агента в бизнес за 5 минут",
  description: "Сервис для создания AI агентов для бизнеса.",
  icons: {
    icon: "/logo.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${montserrat.variable} ${unbounded.variable}`} suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className="bg-white text-black antialiased font-sans" suppressHydrationWarning>
        <TelegramMiniAppProvider>
          {children}
        </TelegramMiniAppProvider>
      </body>
    </html>
  );
}

