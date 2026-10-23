"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { ORDER_TYPES, PAYMENT_METHODS, orderStatusLabel, isOrderCollectable } from "@/lib/orderDisplay";
import type { OrderStatus } from "@/types";

type CashOrder = {
  id: string;
  publicCode: string;
  customer: string;
  type: keyof typeof ORDER_TYPES;
  total: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
};

export default function CashDesk() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [orders, setOrders] = useState<CashOrder[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const search = useCallback((q: string, signal?: AbortSignal) => fetch(`/api/admin/cash?q=${encodeURIComponent(q)}`, {
    cache: "no-store", signal,
  }).then(async (response) => {
    const result = await response.json();
    if (response.status === 401) router.replace("/admin/login");
    if (!response.ok) throw new Error(result.error || "Ricerca non disponibile.");
    setOrders(result.orders);
    setHasMore(result.hasMore);
    setError("");
  }).catch((error: unknown) => {
    if (signal?.aborted) return;
    setError(error instanceof Error ? error.message : "Ricerca non disponibile.");
  }).finally(() => { if (!signal?.aborted) setLoading(false); }), [router]);

  useEffect(() => {
    const controller = new AbortController();
    void search("", controller.signal);
    return () => controller.abort();
  }, [search]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setOrders([]);
    void search(query);
  };

  return (
    <section style={{ maxWidth: "1100px", margin: "0 auto", padding: "24px 16px 48px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap", marginBottom: "28px" }}>
        <h1 className="font-display" style={{ fontSize: "36px" }}>Cassa e ritiro</h1>
        <Link href="/admin" style={{ color: "#D4A843" }}>Torna all&apos;amministrazione</Link>
      </header>
      <form onSubmit={submit} style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "24px" }}>
        <label style={{ flex: "1 1 240px" }}>
          <span style={{ display: "block", marginBottom: "8px" }}>Cerca numero ordine o nome</span>
          <input className="input-field" value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="A-042 oppure Mario Rossi" maxLength={120} autoFocus />
        </label>
        <button className="btn-ember" disabled={loading} style={{ alignSelf: "flex-end" }}>
          {loading ? "Ricerca..." : "Cerca"}
        </button>
      </form>
      {error && <p role="alert" style={{ color: "#FCA5A5", marginBottom: "16px" }}>{error}</p>}
      {hasMore && <p style={{ color: "#D4A843", marginBottom: "16px" }}>Mostrati 50 risultati. Cerca il numero completo o un nome piu&apos; preciso.</p>}
      {!loading && !error && orders.length === 0 && <p>Nessun ordine trovato.</p>}
      <div style={{ display: "grid", gap: "14px" }}>
        {orders.map((order) => (
          <Link key={order.id} href={`/admin/cash/${order.id}`} className="card" style={{
            padding: "20px", display: "flex", gap: "20px", justifyContent: "space-between",
            flexWrap: "wrap", color: "#F5EDD8", textDecoration: "none", overflowWrap: "anywhere",
          }}>
            <div>
              <strong style={{ fontSize: "32px", color: "#D4A843" }}>{order.publicCode}</strong>
              <p>{order.customer}</p>
              <p style={{ color: "#8A7566", fontSize: "13px" }}>{ORDER_TYPES[order.type]} · {new Date(order.createdAt).toLocaleString("it-IT")}</p>
            </div>
            <div>
              <strong style={{ fontSize: "28px" }}>{formatPrice(order.total)}</strong>
              <p>{order.paymentStatus === "paid" ? "PAGATO" : "NON PAGATO"}</p>
              <p>{orderStatusLabel(order.status, order.type)}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function CashActions({ id, status, type, paymentStatus, total }: {
  id: string; status: OrderStatus; type: string; paymentStatus: string; total: number;
}) {
  const router = useRouter();
  const [method, setMethod] = useState<keyof typeof PAYMENT_METHODS>("cash");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const paid = paymentStatus === "paid";
  const closed = status === "cancelled" || status === "delivered";
  const canCollect = paid && isOrderCollectable(status, type);

  const act = async (action: "pay" | "collect") => {
    const prompt = action === "pay"
      ? `Confermi di avere ricevuto ${formatPrice(total)} tramite ${PAYMENT_METHODS[method]}? Questa operazione registra un incasso, non esegue addebiti.`
      : "Confermi di avere consegnato questo ordine al cliente?";
    if (!window.confirm(prompt)) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}/cash`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action === "pay" ? { action, method } : { action }),
      });
      const result = await response.json();
      if (response.status === 401) router.replace("/admin/login");
      if (!response.ok) throw new Error(result.error || "Operazione non riuscita.");
      setMessage(result.alreadyProcessed ? "Operazione gia' registrata. Nessun duplicato." : "Operazione registrata.");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Operazione non riuscita.");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card" style={{ padding: "24px", marginTop: "20px", display: "grid", gap: "16px" }}>
      <h2>Operazioni di cassa</h2>
      {error && <p role="alert" style={{ color: "#FCA5A5" }}>{error}</p>}
      {message && <p role="status" style={{ color: "#6EE7B7" }}>{message}</p>}
      {!paid && !closed && <>
        <p>Registra solo denaro effettivamente ricevuto. Il sito non addebita carte e non emette documenti fiscali.</p>
        <label>Metodo di incasso
          <select className="input-field" value={method} onChange={(e) => {
            const value = e.target.value;
            if (value === "cash" || value === "card" || value === "transfer") setMethod(value);
          }} disabled={busy}>
            {Object.entries(PAYMENT_METHODS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="btn-ember" onClick={() => act("pay")} disabled={busy}>Registra pagamento · {formatPrice(total)}</button>
      </>}
      {!closed && <button className="btn-ember" onClick={() => act("collect")} disabled={busy || !canCollect}>
        {type === "delivery" ? "Segna consegnato" : "Segna ritirato"}
      </button>}
      {!closed && !canCollect && <p style={{ color: "#8A7566" }}>
        Occorrono pagamento registrato e ordine {type === "delivery" ? "in consegna" : "pronto"}.
        La preparazione si gestisce dalla scheda Ordini nell&apos;amministrazione.
      </p>}
      {closed && <p>{status === "cancelled" ? "Ordine annullato." : "Consegna gia' registrata: non consegnare una seconda volta."}</p>}
      <button className="btn-ghost" disabled={busy} onClick={() => router.refresh()}>Aggiorna ordine</button>
    </section>
  );
}
