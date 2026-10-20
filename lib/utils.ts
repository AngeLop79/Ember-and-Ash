import { CartItem } from "@/types";
import { RESTAURANT_INFO } from "./data";

export function formatPrice(amount: number): string {
  // Use a deterministic formatter to avoid server/client Intl differences during hydration
  const parts = Math.round(amount).toString().split("");
  let res = "";
  for (let i = parts.length - 1, j = 0; i >= 0; i--, j++) {
    res = parts[i] + res;
    if (j % 3 === 2 && i !== 0) res = "," + res;
  }
  return `₦${res}`;
}

export function generateOrderId(): string {
  return `EA-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 6)
    .toUpperCase()}`;
}

export function buildWhatsAppOrderMessage(
  items: CartItem[],
  total: number,
  type: "delivery" | "pickup" | "dine-in",
  customerName?: string,
  address?: string,
): string {
  const itemLines = items
    .map(
      (item) =>
        `• ${item.name} x${item.quantity} — ${formatPrice(item.price * item.quantity)}${
          item.notes ? ` _(${item.notes})_` : ""
        }`,
    )
    .join("\n");

  const orderType =
    type === "delivery"
      ? `🛵 *Consegna a domicilio*${address ? `\nIndirizzo: ${address}` : ""}`
      : type === "pickup"
        ? "🏃 *Ritiro in sede*"
        : "🍽️ *Consumo al ristorante*";

  return encodeURIComponent(
    `Salve I ragazzi del sole! 🔥\n\nVorrei effettuare un ordine:\n\n${itemLines}\n\n💰 *Totale: ${formatPrice(
      total,
    )}*\n\n${orderType}${
      customerName ? `\n\n👤 Nome: ${customerName}` : ""
    }\n\nConfermate il mio ordine, grazie!`,
  );
}

export function buildWhatsAppReservationMessage(
  name: string,
  date: string,
  time: string,
  guests: number,
  requests?: string,
): string {
  return encodeURIComponent(
    `Salve I ragazzi del sole! 🔥\n\nVorrei prenotare un tavolo:\n\n👤 Nome: ${name}\n📅 Data: ${date}\n⏰ Ora: ${time}\n👥 Ospiti: ${guests}${
      requests ? `\n📝 Richieste speciali: ${requests}` : ""
    }\n\nConfermate la mia prenotazione, grazie!`,
  );
}

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${RESTAURANT_INFO.whatsapp.replace(/\+/g, "")}?text=${message}`;
}

export function calculateDeliveryFee(subtotal: number): number {
  if (subtotal >= RESTAURANT_INFO.freeDeliveryAbove) return 0;
  return RESTAURANT_INFO.deliveryFee;
}

export function getSpiceLevelLabel(level: number): string {
  const labels = ["Delicato", "Medio", "Piccante", "Molto piccante 🔥"];
  return labels[level] || "Delicato";
}
