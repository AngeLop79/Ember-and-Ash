import type { OrderDetails } from "@/lib/orders";
import { ORDER_TYPES, orderStatusLabel } from "@/lib/orderDisplay";
import { formatPrice } from "@/lib/utils";

export const ORDER_TEMPLATE_NAMES = [
  "customer_name", "order_code", "items", "total", "order_type", "address", "status",
] as const;

export const SAGRA_TEMPLATE_NAMES = ["customer_name", "order_id"] as const;

export function sagraTemplateParameters(order: OrderDetails): string[] {
  return [order.customer, order.publicCode].map((text) => text.replace(/\s+/g, " ").trim());
}

export function validOrderBaseUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      url.pathname === "/" && !url.search && !url.hash && !url.port &&
      url.hostname.includes(".") && !/^[\d.]+$/.test(url.hostname) &&
      !/(^|\.)(localhost|local|internal|invalid|test)$/.test(url.hostname);
  } catch {
    return false;
  }
}

export function orderTemplateParameters(order: OrderDetails): string[] {
  return [
    order.customer,
    order.publicCode,
    order.items.map((item) =>
      `${item.quantity} x ${item.name} (${formatPrice(item.quantity * item.unitPrice)})${item.notes ? ` - ${item.notes}` : ""}`,
    ).join("; "),
    formatPrice(order.total),
    ORDER_TYPES[order.type],
    order.address || "Non previsto",
    `${orderStatusLabel(order.status, order.type)}; ${order.paymentStatus === "paid" ? "pagato" : order.status === "cancelled" ? "annullato" : "da pagare in cassa"}`,
  ].map((text) => text.replace(/\s+/g, " ").trim());
}
