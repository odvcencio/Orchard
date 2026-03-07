import type { Metadata } from "next";
import localFont from "next/font/local";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryProvider } from "@/lib/api/query-provider";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";

const geistSans = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  variable: "--font-sans-face",
  display: "swap",
});

const geistMono = localFont({
  src: "../../node_modules/next/dist/next-devtools/server/font/geist-mono-latin.woff2",
  variable: "--font-mono-face",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Orchard",
  description: "Code hosting that understands your code",
};

const themeInitScript = `
(() => {
  try {
    const key = "orchard-theme";
    const saved = window.localStorage.getItem(key);
    const theme = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);
    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.dataset.theme = theme;
  } catch {
    document.documentElement.classList.add("dark");
    document.documentElement.dataset.theme = "system";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <QueryProvider>
          <AuthProvider>
            <TooltipProvider>{children}</TooltipProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
