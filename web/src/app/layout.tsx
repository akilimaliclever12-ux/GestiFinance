import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { ToastProvider } from "@/components/Toast";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GestiFinance",
  description: "Gestion des finances scolaires — Offline First",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GestiFinance",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1668e3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
