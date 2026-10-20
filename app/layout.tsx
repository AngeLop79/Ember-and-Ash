import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/layout/Navbar";
import Cart from "@/components/order/Cart";
import PageTransition from "@/components/layout/PageTransition";

export const metadata: Metadata = {
  title: "Ember & Ash — Sapori alla brace",
  description:
    "Scopri i sapori della cucina nigeriana alla brace. Ordina online, prenota un tavolo o ricevi il tuo ordine a domicilio.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it">
      <body className="grain">
        <Navbar />
        <Cart />
        <main>
          <PageTransition>{children}</PageTransition>
        </main>
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
