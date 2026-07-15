import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ActiveThemeProvider } from "@/components/active-theme";
import { ApolloClientProvider } from "@/components/providers/apollo-provider";
import { GoogleOAuthProvider } from '@react-oauth/google';

// --- 1. CONFIGURATION VIEWPORT ---
export const viewport: Viewport = {
  themeColor: "#1f2937",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

// --- 2. CONFIGURATION METADATA ---
export const metadata: Metadata = {
  title: "Urba Events Dashboard",
  description: "A fully responsive analytics dashboard.",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/logo192.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/logo192.png",
    },
  },
  appleWebApp: {
    title: "UrbaEvents",
    statusBarStyle: "black-translucent",
    startupImage: ["/logo512.png"],
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
        suppressHydrationWarning
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
          <GoogleOAuthProvider clientId="384169644096-n1hjir3eqjfa0k49qc2636kqsfvfunn0.apps.googleusercontent.com">
            <ApolloClientProvider>
              <ActiveThemeProvider initialTheme={activeThemeValue}>
                {children}
              </ActiveThemeProvider>
            </ApolloClientProvider>
          </GoogleOAuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}