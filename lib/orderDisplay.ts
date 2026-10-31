import type { OrderStatus } from "@/types";

export const ORDER_TYPES = {
  delivery: "Ordine precedente",
  pickup: "Ritiro in sede",
  "dine-in": "Consumo al ristorante",
};

export const PAYMENT_METHODS = {
  cash: "Contanti",
  card: "Carta / POS",
  transfer: "Bonifico verificato",
};

export function isOrderCollectable(status: OrderStatus, type: string): boolean {
  void type;
  // Accept the legacy courier state so existing orders can still be closed.
  return status === "ready" || status === "out-for-delivery";
}

export function orderStatusLabel(status: OrderStatus, type: string): string {
  void type;
  if (status === "delivered") return "Ritirato";
  return {
    pending: "In attesa di conferma",
    confirmed: "Confermato",
    preparing: "In preparazione",
    ready: "Pronto",
    "out-for-delivery": "Pronto",
    delivered: "Consegnato",
    cancelled: "Annullato",
  }[status];
}
