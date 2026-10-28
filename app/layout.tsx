import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SiteShell from "@/components/layout/SiteShell";
import PageTransition from "@/components/layout/PageTransition";

const displayFont = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display-face",
});
const bodyFont = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body-face",
});

export const metadata: Metadata = {
  title: "XIII Sagra del Maiale",
  description:
    "XIII Sagra del Maiale, organizzata dall'Associazione I Ragazzi del Sole. Scopri i sapori della cucina calabrese ed effettua un preordine online.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1a1612",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body className="grain">
        <SiteShell>
          <main>
            <PageTransition>{children}</PageTransition>
          </main>
        </SiteShell>
        <Toaster
          position="top-center"
          containerStyle={{ top: 80, zIndex: 9999 }}
          toastOptions={{
            style: {
              background: "#2A221C",
              color: "#F5EDD8",
              border: "1px solid #3D3028",
              fontFamily: "var(--font-body)",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#E8541A", secondary: "#F5EDD8" },
            },
          }}
        />
      </body>
    </html>
  );
}
