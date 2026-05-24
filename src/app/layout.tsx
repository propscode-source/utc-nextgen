import type { Metadata, Viewport } from "next";
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

// Responsive viewport — scales to device width, allows user pinch-zoom up to 5×.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1228" },
  ],
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
