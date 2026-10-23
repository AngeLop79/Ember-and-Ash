import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";
import { sendOrderNotification } from "@/lib/whatsapp";
import { notificationMessage } from "@/lib/orderNotifications";
import { whatsappOrderNotificationsEnabled } from "@/lib/features";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!whatsappOrderNotificationsEnabled()) {
    return Response.json({ error: "Notifiche WhatsApp disattivate." }, { status: 404 });
  }
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await getDb().query(
      `UPDATE order_notifications SET status = 'pending', error_code = NULL, updated_at = NOW()
       WHERE order_id = $1 AND status IN ('pending', 'not_configured', 'failed') RETURNING order_id`,
      [id.toUpperCase()],
    );
    if (!result.rowCount) {
      return Response.json(
        { error: "Nessun invio ripetibile. Un invio gia' accettato, in corso o dall'esito incerto non viene duplicato." },
        { status: 409 },
      );
    }
    const status = await sendOrderNotification(id.toUpperCase());
    return Response.json({ status, message: notificationMessage(status) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to retry order notification.", { orderId: id, error });
    return Response.json({ error: "Esito WhatsApp non disponibile. Verifica prima di riprovare." }, { status: 503 });
  }
}
