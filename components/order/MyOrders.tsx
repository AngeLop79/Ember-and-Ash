"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { notificationMessage, type NotificationStatus } from "@/lib/orderNotifications";
import type { OrderStatus } from "@/types";
import { useFeatureStore } from "@/store/featureStore";
import { orderStatusLabel } from "@/lib/orderDisplay";

type PersonalOrder = {
  id: string;
  publicCode: string;
  paymentStatus: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  deliveryFee: number;
  type: "delivery" | "pickup" | "dine-in";
  createdAt: string;
  address: string | null;
  paymentMethod: string;
  whatsappStatus: NotificationStatus | null;
  items: { name: string; quantity: number; unitPrice: number; notes: string | null }[];
};

const TYPES = { delivery: "Consegna a domicilio", pickup: "Ritiro in sede", "dine-in": "Consumo al ristorante" };
const PAYMENTS: Record<string, string> = { card: "Carta (simulata)", cash: "Contanti", transfer: "Bonifico (simulato)" };

export default function MyOrders() {
  const whatsappEnabled = useFeatureStore((state) => state.whatsappOrderNotifications);
  const [orders, setOrders] = useState<PersonalOrder[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const busy = useRef(false);
  const mounted = useRef(true);

  const load = useCallback((cursor?: string) => {
    if (busy.current) return;
    busy.current = true;
    return fetch(
      `/api/orders/mine${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`,
      { cache: "no-store" },
    ).then(async (response) => {
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 401) await useAuthStore.getState().refreshSession();
        throw new Error(result.error || "Impossibile caricare gli ordini.");
      }
      return result;
    }).then((result) => {
      if (!mounted.current) return;
      setOrders((previous) => cursor
        ? [...previous, ...result.orders.filter((order: PersonalOrder) => !previous.some((item) => item.id === order.id))]
        : result.orders);
      setNextCursor(result.nextCursor);
      setError("");
    }).catch((error: unknown) => {
      if (mounted.current) setError(error instanceof Error ? error.message : "Ricerca non disponibile.");
    }).finally(() => {
      busy.current = false;
      if (mounted.current) setLoading(false);
    });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void load();
    return () => { mounted.current = false; };
  }, [load]);

  const refresh = (cursor?: string) => {
    setLoading(true);
    void load(cursor);
  };

  return (
    <section className="page-shell" style={{ padding: "100px 20px 48px", maxWidth: "1100px", margin: "0 auto" }}>
      <div style={{ display: "flex", gap: "16px", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", marginBottom: "24px" }}>
        <div>
          <p className="section-label">Area cliente</p>
          <h1 className="font-display" style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "12px 0" }}>I miei ordini</h1>
          <p style={{ color: "#8A7566" }}>Tutti gli ordini del tuo account, dal piu&apos; recente. Non serve inserire codici.</p>
        </div>
        <button className="btn-ember" disabled={loading} onClick={() => refresh()}>
          {loading ? "Caricamento..." : "Aggiorna"}
        </button>
      </div>
      {error && <p role="alert" style={{ color: "#FCA5A5", marginBottom: "20px" }}>{error}</p>}
      {!loading && !error && orders.length === 0 && (
        <div className="card" style={{ padding: "28px" }}>
          <h2>Non hai ancora effettuato ordini</h2>
          <p style={{ margin: "16px 0", color: "#8A7566" }}>I nuovi ordini saranno visibili qui anche sugli altri dispositivi.</p>
          <Link href="/menu" className="btn-ember">Scopri il menu</Link>
        </div>
      )}
      <div className="personal-orders">
        {orders.map((order) => (
          <article key={order.id} className="card" style={{ padding: "22px", minWidth: 0, overflowWrap: "anywhere" }}>
            <header style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "24px", color: "#D4A843" }}>{order.publicCode}</h2>
              <span style={{ color: order.status === "cancelled" ? "#FCA5A5" : "#D4A843", fontWeight: 600 }}>{orderStatusLabel(order.status, order.type)}</span>
            </header>
            <p style={{ color: "#8A7566", fontSize: "13px", marginBottom: "12px" }}>
              {new Date(order.createdAt).toLocaleString("it-IT")} · {TYPES[order.type]}
            </p>
            <ul style={{ paddingLeft: "18px", marginBottom: "16px" }}>
              {order.items.map((item, index) => <li key={index}>{item.quantity} x {item.name}</li>)}
            </ul>
            <p style={{ fontWeight: 700, fontSize: "20px", marginBottom: "16px" }}>Totale {formatPrice(order.total)}</p>
            <p style={{ marginBottom: "16px" }}>{order.paymentStatus === "paid" ? "Pagato" : order.status === "cancelled" ? "Annullato" : "Da pagare in cassa"}</p>
            <Link href={`/orders/${order.id}`} className="btn-ghost" style={{ marginBottom: "16px" }}>Mostra ordine in cassa</Link>
            <details>
              <summary style={{ cursor: "pointer", color: "#D4A843" }}>Dettagli dell&apos;ordine</summary>
              <div style={{ paddingTop: "16px", display: "grid", gap: "10px", fontSize: "14px" }}>
                {order.items.map((item, index) => (
                  <p key={index}>
                    {item.quantity} x {item.name}: {formatPrice(item.unitPrice * item.quantity)}
                    {item.notes && <span style={{ display: "block", color: "#8A7566" }}>Note: {item.notes}</span>}
                  </p>
                ))}
                <p>Piatti: {formatPrice(order.subtotal)} · Consegna: {formatPrice(order.deliveryFee)}</p>
                <p>Pagamento: {PAYMENTS[order.paymentMethod]}</p>
                {order.address && <p>Indirizzo: {order.address}</p>}
                {whatsappEnabled && <p>{notificationMessage(order.whatsappStatus)}</p>}
              </div>
            </details>
          </article>
        ))}
      </div>
      {nextCursor && (
        <button className="btn-ghost" disabled={loading} onClick={() => refresh(nextCursor)} style={{ marginTop: "24px" }}>
          Carica ordini precedenti
        </button>
      )}
      <style>{`
        .personal-orders { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }
        @media (max-width: 700px) { .personal-orders { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </section>
  );
}
