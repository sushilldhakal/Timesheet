import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils/cn";
import "./globals.css";
import "@/components/scheduling/packages/shadcn-scheduler/src/core/scheduler.css";
import { SetupGuard } from "@/components/setup";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { THEME_STORAGE_KEY } from "@/lib/utils/theme";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { Toaster } from "@/components/ui/sonner";

// display: "swap" avoids invisible text while font loads (no FOIT)
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Timesheet",
  description: "Timesheet clock in / out",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get(THEME_STORAGE_KEY)?.value;
  const theme = themeCookie === "dark" || themeCookie === "light" ? themeCookie : "light";

  return (
    <html lang="en" className={cn(inter.variable, theme)} suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/web-app-manifest-192x192.png" />
        <meta name="theme-color" content="#2563eb" />
      </head>
      <body className="antialiased min-h-screen font-sans">
        <QueryProvider>
          <ThemeProvider initialTheme={theme}>
            <TooltipProvider>
              <SetupGuard>{children}</SetupGuard>
              <ServiceWorkerRegistration />
              <InstallPrompt />
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
