"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MyOrders from "@/components/order/MyOrders";
import { useAuthStore } from "@/store/authStore";
import toast from "react-hot-toast";

export default function TrackingPage() {
  const router = useRouter();
  const { user, isAuthenticated, hasHydrated, refreshSession } = useAuthStore();

  useEffect(() => {
    if (hasHydrated && (!isAuthenticated || !user)) {
      router.replace("/auth?next=/tracking");
    }
  }, [hasHydrated, isAuthenticated, router, user]);

  if (!hasHydrated) {
    return (
      <div style={{ padding: "100px 24px" }}>
        <p>Verifica della sessione in corso...</p>
        <button
          className="btn-ghost"
          onClick={() => {
            void refreshSession().catch((error: unknown) => {
              toast.error(error instanceof Error ? error.message : "Sessione non disponibile.");
            });
          }}
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div style={{ padding: "100px 24px" }}>
        <p>Reindirizzamento all’accesso...</p>
      </div>
    );
  }

  return <MyOrders key={user.id} />;
}
