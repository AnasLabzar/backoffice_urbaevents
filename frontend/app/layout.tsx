import { cookies } from "next/headers";
import type { Metadata } from "next";

import "./globals.css";

import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ActiveThemeProvider } from "@/components/active-theme";
import { ApolloClientProvider } from "@/components/providers/apollo-provider"; // <-- 1. IMPORT L-Jdid

export const metadata: Metadata = {
  title: "Urba Events Dashboard",
  description:
    "A fully responsive analytics dashboard featuring dynamic charts, interactive tables, a collapsible sidebar, and a light/dark mode theme switcher. Built with modern web technologies, it ensures seamless performance across devices, offering an intuitive user interface for data visualization and exploration.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const activeThemeValue = cookieStore.get("active_theme")?.value;
  const isScaled = activeThemeValue?.endsWith("-scaled");

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "bg-background overscroll-none font-sans antialiased",
          activeThemeValue ? `theme-${activeThemeValue}` : "",
          isScaled ? "theme-scaled" : ""
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          {/* ---- 2. GHLF B L-PROVIDER JDID ---- */}
          <ApolloClientProvider>
            <ActiveThemeProvider initialTheme={activeThemeValue}>
              {children}
            </ActiveThemeProvider>
          </ApolloClientProvider>
          {/* ------------------------------------ */}
        </ThemeProvider>
      </body>
    </html>
  );
}
