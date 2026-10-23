export function whatsappOrderNotificationsEnabled(): boolean {
  return process.env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED === "true";
}
