export function whatsappOrderNotificationsEnabled(): boolean {
  return process.env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED === "true";
}

export function reservationsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_RESERVATIONS_ENABLED !== "false";
}
