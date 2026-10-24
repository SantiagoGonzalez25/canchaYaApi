import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CanchaYa · ACUDES e Inscripciones",
    template: "%s · CanchaYa",
  },
  description:
    "Cartelera digital, inscripciones y ocupación de escenarios para las actividades culturales y deportivas del TdeA.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense
          fallback={<div className="h-16 border-b border-slate-200 bg-white/90" aria-hidden />}
        >
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200/70 py-5 text-center text-xs text-slate-500">
          CanchaYa · Bienestar Institucional TdeA · Regla de cero reservas: la ocupación nace de los
          ACUDES, no de reservas individuales.
        </footer>
      </body>
    </html>
  );
}
