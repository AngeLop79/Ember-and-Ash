import { getDb } from "@/lib/db";

import type { NotificationStatus } from "@/lib/orderNotifications";
import { whatsappOrderNotificationsEnabled } from "@/lib/features";
import { getOrderDetails } from "@/lib/orders";
import { ORDER_TEMPLATE_NAMES, orderTemplateParameters, validOrderBaseUrl } from "@/lib/whatsappTemplate";

export async function sendOrderNotification(orderId: string): Promise<NotificationStatus | null> {
  if (!whatsappOrderNotificationsEnabled()) return null;
  const db = getDb();
  const config = {
    token: process.env.WHATSAPP_ACCESS_TOKEN,
    phoneId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    version: process.env.WHATSAPP_API_VERSION,
    template: process.env.WHATSAPP_ORDER_TEMPLATE,
    language: process.env.WHATSAPP_TEMPLATE_LANGUAGE,
    templateVersion: process.env.WHATSAPP_ORDER_TEMPLATE_VERSION ?? "1",
    parameterFormat: process.env.WHATSAPP_TEMPLATE_PARAMETER_FORMAT ?? "positional",
    baseUrl: process.env.APP_BASE_URL,
  };
  if (!config.token || !config.phoneId || !config.version || !config.template || !config.language) {
    await db.query(
      `UPDATE order_notifications SET status = 'not_configured', error_code = 'CONFIG_MISSING', updated_at = NOW()
       WHERE order_id = $1 AND status = 'pending'`, [orderId],
    );
    console.warn("WhatsApp configuration incomplete; notification not sent.", { orderId });
  } else {
    const claim = await db.query<{ recipient: string; parameters: string[] }>(
      `UPDATE order_notifications SET status = 'sending', updated_at = NOW()
       WHERE order_id = $1 AND status = 'pending' RETURNING recipient, parameters`, [orderId],
    );
    const notification = claim.rows[0];
    if (notification) {
      let status: NotificationStatus = "unknown";
      let messageId: string | null = null;
      let errorCode: string | null = null;
      try {
        if (!/^v\d+\.\d+$/.test(config.version) || !/^\d+$/.test(config.phoneId) ||
            !["1", "2"].includes(config.templateVersion) ||
            !["named", "positional"].includes(config.parameterFormat) ||
            (config.templateVersion === "2" && !validOrderBaseUrl(config.baseUrl))) {
          status = "failed";
          errorCode = "CONFIG_INVALID";
        } else {
          const order = config.templateVersion === "2" ? await getOrderDetails(orderId) : null;
          if (config.templateVersion === "2" && !order) {
            throw new Error("Notification order not found.");
          }
          const parameters = order ? orderTemplateParameters(order) : notification.parameters;
          const components = [{
            type: "body",
            parameters: parameters.map((text, index) => ({
              type: "text", text,
              ...(config.parameterFormat === "named" ? { parameter_name: ORDER_TEMPLATE_NAMES[index] } : {}),
            })),
          }, ...(order ? [{
            type: "button", sub_type: "url", index: "0",
            parameters: [{
              type: "text", text: order.id,
              ...(config.parameterFormat === "named" ? { parameter_name: "order_id" } : {}),
            }],
          }] : [])];
          const response = await fetch(
            `https://graph.facebook.com/${config.version}/${config.phoneId}/messages`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
              signal: AbortSignal.timeout(8000),
              body: JSON.stringify({
                messaging_product: "whatsapp",
                to: notification.recipient,
                type: "template",
                template: {
                  name: config.template,
                  language: { code: config.language },
                  components,
                },
              }),
            },
          );
          const result = await response.json();
          if (response.ok && typeof result.messages?.[0]?.id === "string") {
            status = "accepted";
            messageId = result.messages[0].id;
          } else {
            // A timeout or server error may occur after Meta accepted the message.
            status = response.status >= 400 && response.status < 500 ? "failed" : "unknown";
            errorCode = String(result.error?.code ?? `HTTP_${response.status}`);
          }
        }
      } catch (error) {
        errorCode = error instanceof Error ? error.name : "NETWORK_ERROR";
        console.error("WhatsApp request outcome is unknown.", { orderId, errorCode });
      }
      await db.query(
        `UPDATE order_notifications SET status = $2, provider_message_id = $3,
         error_code = $4, updated_at = NOW() WHERE order_id = $1`,
        [orderId, status, messageId, errorCode],
      );
      if (status !== "accepted") {
        console.error("WhatsApp notification not accepted.", { orderId, status, errorCode });
      }
    }
  }
  const result = await db.query<{ status: NotificationStatus }>(
    "SELECT status FROM order_notifications WHERE order_id = $1", [orderId],
  );
  return result.rows[0]?.status ?? null;
}
