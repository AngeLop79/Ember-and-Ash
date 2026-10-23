import type { OrderStatus } from "@/types";

export const ORDER_TYPES = {
  delivery: "Consegna a domicilio",
  pickup: "Ritiro in sede",
  "dine-in": "Consumo al ristorante",
};

export const PAYMENT_METHODS = {
  cash: "Contanti",
  card: "Carta / POS",
  transfer: "Bonifico verificato",
};

export function isOrderCollectable(status: OrderStatus, type: string): boolean {
  if (type === "delivery") return status === "out-for-delivery";
  // Older pickup orders could also enter the courier step.
  return status === "ready" || status === "out-for-delivery";
}

export function orderStatusLabel(status: OrderStatus, type: string): string {
  if (status === "delivered" && type !== "delivery") return "Ritirato";
  return {
    pending: "In attesa di conferma",
    confirmed: "Confermato",
    preparing: "In preparazione",
    ready: "Pronto",
    "out-for-delivery": "In consegna",
    delivered: "Consegnato",
    cancelled: "Annullato",
  }[status];
}
