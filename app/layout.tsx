import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import { Suspense } from "react";
import { Header } from "@/components/header";
import "./globals.css";

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CanchaYa · ACUDES e Inscripciones",
    template: "%s · CanchaYa",
  },
  description:
    "Sistema de gestión de ACUDES del Tecnológico de Antioquia.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Suspense
          fallback={<div className="h-16 border-b border-slate-200 bg-white/90" aria-hidden />}
        >
          <Header />
        </Suspense>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8">{children}</main>
        <footer className="border-t border-slate-200/70 py-5 text-center text-xs text-slate-500">
          CanchaYa · Bienestar Institucional TdeA
        </footer>
      </body>
    </html>
  );
}
