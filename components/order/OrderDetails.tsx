import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { ORDER_TYPES, PAYMENT_METHODS, orderStatusLabel } from "@/lib/orderDisplay";
import type { OrderDetails as Order } from "@/lib/orders";
import RefreshOrder from "@/components/order/RefreshOrder";

export default function OrderDetails({ order, staff = false }: { order: Order; staff?: boolean }) {
  return (
    <article className="card" style={{ padding: "clamp(18px, 4vw, 32px)", overflowWrap: "anywhere" }}>
      <p className="section-label">Numero ordine da mostrare in cassa</p>
      <h1 className="font-display" style={{ fontSize: "clamp(40px, 10vw, 72px)", color: "#D4A843", margin: "12px 0" }}>{order.publicCode}</h1>
      <p style={{ fontSize: "20px", marginBottom: "12px" }}>{order.customer}</p>
      <p style={{ color: "#D4A843", marginBottom: "12px" }}>{orderStatusLabel(order.status, order.type)}</p>
      <p style={{ marginBottom: "16px" }}>{ORDER_TYPES[order.type]} · {order.createdAt.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>
      <div style={{ display: "grid", gap: "12px", marginBottom: "24px" }}>
        {order.items.map((item, index) => (
          <div key={index} style={{ borderBottom: "1px solid #3D3028", paddingBottom: "10px" }}>
            <p>{item.quantity} x {item.name} — {formatPrice(item.quantity * item.unitPrice)}</p>
            {item.notes && <p style={{ color: "#8A7566", fontSize: "13px" }}>Note: {item.notes}</p>}
          </div>
        ))}
      </div>
      <p>Piatti: {formatPrice(order.subtotal)} · Consegna: {formatPrice(order.deliveryFee)}</p>
      <p style={{ fontSize: "28px", fontWeight: 700, margin: "16px 0" }}>Totale {formatPrice(order.total)}</p>
      <p style={{ color: order.paymentStatus === "paid" ? "#6EE7B7" : "#D4A843", fontWeight: 700 }}>
        {order.paymentStatus === "paid" ? "PAGATO" : order.status === "cancelled" ? "ORDINE ANNULLATO" : "DA PAGARE IN CASSA"}
      </p>
      {order.receivedPaymentMethod && <p>{PAYMENT_METHODS[order.receivedPaymentMethod]}</p>}
      {order.paidAt && <p>Pagamento registrato: {order.paidAt.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>}
      {order.collectedAt && <p>Consegna / ritiro registrato: {order.collectedAt.toLocaleString("it-IT", { timeZone: "Europe/Rome" })}</p>}
      {order.address && <p style={{ marginTop: "16px" }}>Indirizzo: {order.address}</p>}
      <p style={{ color: "#8A7566", fontSize: "13px", margin: "20px 0" }}>
        Mostra il numero allo staff. Questo riepilogo non e&apos; un documento fiscale.
        Lo staff verifica pagamento e consegna sul sistema.
      </p>
      <Link href={staff ? "/admin/cash" : "/tracking"} style={{ color: "#D4A843" }}>
        {staff ? "Torna alla cassa" : "Tutti i miei ordini"}
      </Link>
      <div style={{ marginTop: "16px" }}><RefreshOrder /></div>
    </article>
  );
}
