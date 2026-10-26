import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import SiteShell from "@/components/layout/SiteShell";
import PageTransition from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "XIII Sagra del maiale",
  description:
    "Scopri i sapori della cucina calabrese. Effettua un preordine online.",
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
    <html lang="it">
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
              fontFamily: "'DM Sans', sans-serif",
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
