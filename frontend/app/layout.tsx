import { cookies } from "next/headers";
// ZIDNA Viewport hna
import type { Metadata, Viewport } from "next";

import "./globals.css";

import { cn } from "@/lib/utils";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { ActiveThemeProvider } from "@/components/active-theme";
import { ApolloClientProvider } from "@/components/providers/apollo-provider";

// --- 1. CONFIGURATION DYAL VIEWPORT (Theme Color) ---
export const viewport: Viewport = {
  themeColor: "#1f2937", // L-lon li ayban f chrejo dyal telephone/pc
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// --- 2. CONFIGURATION DYAL METADATA (Icons & Manifest) ---
export const metadata: Metadata = {
  title: "Urba Events Dashboard",
  description:
    "A fully responsive analytics dashboard featuring dynamic charts, interactive tables, a collapsible sidebar.",
  // Hna fin kan-rebto l-manifest
  manifest: "/manifest.json",
  // Hna fin kan-dkhlo l-icons
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo192.png", // Icone pour iPhone/iPad
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/logo192.png",
    },
  },
  appleWebApp: {
    title: "UrbaEvents",
    statusBarStyle: "black-translucent",
    startupImage: [
      "/logo512.png",
    ],
  },
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
          <ApolloClientProvider>
            <ActiveThemeProvider initialTheme={activeThemeValue}>
              {children}
            </ActiveThemeProvider>
          </ApolloClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}