import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/layout/Navbar";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

import { LanguageProvider } from "@/components/providers/LanguageProvider";

export const metadata: Metadata = {
  title: "Job Portal",
  description: "MERN + Next.js Job Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches === true;
                  if (!theme && supportDarkMode) theme = 'dark';
                  if (theme === 'dark') document.documentElement.classList.add('dark');
                  else document.documentElement.classList.remove('dark');
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body>
        <LanguageProvider>
          <ThemeProvider>
            <AuthProvider>
              <Navbar />
              <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
            </AuthProvider>
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
