import { CartItem } from "@/types";
import { RESTAURANT_INFO } from "./data";

export function formatPrice(amount: number): string {
  // Keep server and browser formatting identical during hydration.
  const cents = Math.round(amount);
  const absoluteCents = Math.abs(cents);
  const euros = Math.floor(absoluteCents / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const centPart = (absoluteCents % 100).toString().padStart(2, "0");
  const sign = cents < 0 ? "-" : "";

  return `${sign}${euros},${centPart}\u00a0€`;
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
  type: "pickup" | "dine-in",
  customerName?: string,
): string {
  const itemLines = items
    .map(
      (item) =>
        `- ${item.name} x${item.quantity} - ${formatPrice(item.price * item.quantity)}${
          item.notes ? ` _(${item.notes})_` : ""
        }${item.accessories?.length ? `\n  Personalizzazioni gratuite: ${item.accessories.map(({ name }) => name).join(", ")}` : ""}`,
    )
    .join("\n");

  const orderType =
    type === "pickup" ? "*Ritiro in sede*" : "*Consumo al ristorante*";

  return encodeURIComponent(
    `Salve I ragazzi del sole!\n\nVorrei effettuare un ordine:\n\n${itemLines}\n\n*Totale: ${formatPrice(
      total,
    )}*\n\n${orderType}${
      customerName ? `\n\nNome: ${customerName}` : ""
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
    `Salve I ragazzi del sole!\n\nVorrei prenotare un tavolo:\n\nNome: ${name}\nData: ${date}\nOra: ${time}\nOspiti: ${guests}${
      requests ? `\nRichieste speciali: ${requests}` : ""
    }\n\nConfermate la mia prenotazione, grazie!`,
  );
}

export function getWhatsAppUrl(message: string): string {
  return `https://wa.me/${RESTAURANT_INFO.whatsapp.replace(/\+/g, "")}?text=${message}`;
}

export function getSpiceLevelLabel(level: number): string {
  const labels = ["Delicato", "Medio", "Piccante", "Molto piccante 🔥"];
  return labels[level] || "Delicato";
}
