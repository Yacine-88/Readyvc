import type { Metadata, Viewport } from "next";
import { DM_Sans, DM_Serif_Display, JetBrains_Mono } from "next/font/google";
import { I18nProvider } from "@/lib/i18n";
import { AuthProvider } from "@/lib/auth-context";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import "./globals.css";

// Force dev server recompile - bugs fixed in metrics, valuation, and qa engines

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VCReady - Measure your readiness before you raise",
  description:
    "VCReady helps founders measure, benchmark and improve the signals that matter to investors before fundraising starts.",
  keywords: ["startup", "fundraising", "valuation", "investor", "VC", "metrics"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F7F7F5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmSerifDisplay.variable} ${jetbrainsMono.variable}`} data-scroll-behavior="smooth">
      <body className="font-sans antialiased">
        <AnalyticsProvider>
          <AuthProvider>
            <I18nProvider>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
            </I18nProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}
