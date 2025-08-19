"use client";

import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/toaster";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Providers } from "@/hooks/Providers";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Routes where DashboardLayout should NOT appear
  const authRoutes = ["/login", "/register", "/reset-password"];

  const isAuthRoute = authRoutes.includes(pathname);

  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {isAuthRoute ? (
            <>
              {children}
              <Toaster />
            </>
          ) : (
            <DashboardLayout>
              {children}
              <Toaster />
            </DashboardLayout>
          )}
        </Providers>
      </body>
    </html>
  );
}
