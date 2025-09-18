import type React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "@/components/ui/toaster";
import { Suspense } from "react";
import { SchedulerProvider } from "@/contexts/scheduler-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "CS2 Price Tracker",
  description: "Track Steam Market prices for CS2 items",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <SchedulerProvider>{children}</SchedulerProvider>
          <Toaster />
          <Analytics />
        </Suspense>
      </body>
    </html>
  );
}
