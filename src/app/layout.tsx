import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NeuroRepo — AI-Powered Codebase Explainer",
  description: "Understand any codebase in seconds. Analyze architecture, explore code, visualize dependencies, and get AI-powered insights.",
  keywords: ["codebase", "analysis", "AI", "architecture", "developer tools"],
  icons: {
    icon: "/neurorepo-log.png",
    apple: "/neurorepo-log.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-[#0a0a0f] text-slate-200 antialiased font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
