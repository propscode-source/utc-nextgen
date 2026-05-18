import type { Metadata } from "next";
import "./globals.css";
import "@/lib/fontawesome";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthSessionProvider } from "@/components/session-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: {
    default: "UTC NextGen — Unsri Training Center",
    template: "%s | UTC NextGen",
  },
  description: "Sistem Training Center Terpusat Berbasis Gamifikasi — Fakultas Ilmu Komputer Unsri.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <AuthSessionProvider>{children}</AuthSessionProvider>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
