"use client";

import { usePathname } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import Cart from "@/components/order/Cart";
import { useEffect } from "react";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";
import { useFeatureStore } from "@/store/featureStore";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  useEffect(() => {
    const refresh = () => {
      void useFeatureStore.getState().loadFeatures().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Configurazione non disponibile.");
      });
    };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, []);

  useEffect(() => {
    if (isAdmin) return;
    const refresh = () => {
      void useAuthStore.getState().refreshSession().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "Sessione non disponibile.");
      });
    };
    // Remove obsolete demo credentials; they are never trusted or migrated.
    localStorage.removeItem("ember-auth");
    localStorage.removeItem("ember-accounts");
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [isAdmin]);

  return (
    <>
      {!isAdmin && (
        <>
          <Navbar />
          <Cart />
        </>
      )}
      {children}
    </>
  );
}
