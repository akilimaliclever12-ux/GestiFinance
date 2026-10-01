import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/i18n/client";
import { getI18n, getLocale } from "@/i18n/server";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: "GestiFinance",
    description: `${t.common.appTagline} — Offline First`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: "GestiFinance",
    },
    icons: {
      // Onglet du navigateur : version simplifiée « GF » (lisible en 16–32 px),
      // favicon.ico étant ajouté automatiquement depuis src/app ; l'emblème
      // complet reste pour l'écran d'accueil (apple-touch, PWA).
      icon: { url: "/favicon-96.png", type: "image/png", sizes: "96x96" },
      apple: "/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b6fb8",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
