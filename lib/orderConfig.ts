export type OrderType = "delivery" | "pickup" | "dine-in";
export type PaymentMethod = "card" | "cash" | "transfer";

const orderTypeOptions = [
  ["delivery", false],
  ["pickup", process.env.NEXT_PUBLIC_ORDER_PICKUP_ENABLED !== "false"],
  ["dine-in", process.env.NEXT_PUBLIC_ORDER_DINE_IN_ENABLED === "true"],
] as const;

const paymentMethodOptions = [
  ["card", process.env.NEXT_PUBLIC_ORDER_PAYMENT_CARD_ENABLED === "true"],
  ["cash", process.env.NEXT_PUBLIC_ORDER_PAYMENT_CASH_ENABLED !== "false"],
  ["transfer", process.env.NEXT_PUBLIC_ORDER_PAYMENT_TRANSFER_ENABLED === "true"],
] as const;

export const ENABLED_ORDER_TYPES = orderTypeOptions
  .filter(([, enabled]) => enabled)
  .map(([type]) => type);

export const ENABLED_PAYMENT_METHODS = paymentMethodOptions
  .filter(([, enabled]) => enabled)
  .map(([method]) => method);

export function isEnabledOrderType(value: unknown): value is OrderType {
  return ENABLED_ORDER_TYPES.some((type) => type === value);
}

export function isEnabledPaymentMethod(value: unknown): value is PaymentMethod {
  return ENABLED_PAYMENT_METHODS.some((method) => method === value);
}
