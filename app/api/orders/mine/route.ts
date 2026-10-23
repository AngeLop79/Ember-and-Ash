import { getCustomer } from "@/lib/customerAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const user = await getCustomer();
    if (!user) return Response.json({ error: "Accedi per vedere i tuoi ordini." }, { status: 401, headers });
    const before = new URL(request.url).searchParams.get("before");
    let cursor: { time: string; id: string } | null = null;
    if (before) {
      try {
        const parsed: unknown = JSON.parse(Buffer.from(before, "base64url").toString("utf8"));
        if (
          typeof parsed !== "object" || parsed === null ||
          !("time" in parsed) || typeof parsed.time !== "string" || Number.isNaN(Date.parse(parsed.time)) ||
          !("id" in parsed) || typeof parsed.id !== "string" || parsed.id.length > 100
        ) throw new Error("Invalid cursor");
        cursor = { time: parsed.time, id: parsed.id };
      } catch {
        return Response.json({ error: "Paginazione non valida." }, { status: 400, headers });
      }
    }
    const result = await getDb().query(
      `SELECT o.id, o.public_code AS "publicCode", o.payment_status AS "paymentStatus",
        o.status, o.total, o.subtotal, o.delivery_fee AS "deliveryFee",
        o.order_type AS type, o.created_at AS "createdAt", o.created_at::text AS "cursorTime", o.customer_address AS address,
        o.payment_method AS "paymentMethod", n.status AS "whatsappStatus",
        COALESCE(json_agg(json_build_object(
          'name', i.name, 'quantity', i.quantity, 'unitPrice', i.unit_price, 'notes', i.notes
        ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
       FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
       LEFT JOIN order_notifications n ON n.order_id = o.id
       WHERE o.customer_id = $1 AND ($2::timestamptz IS NULL OR (o.created_at, o.id) < ($2::timestamptz, $3::text))
       GROUP BY o.id, n.status ORDER BY o.created_at DESC, o.id DESC LIMIT 21`,
      [user.id, cursor?.time ?? null, cursor?.id ?? null],
    );
    const hasMore = result.rows.length > 20;
    const orders = result.rows.slice(0, 20);
    return Response.json({
      orders,
      nextCursor: hasMore ? Buffer.from(JSON.stringify({
        time: orders[orders.length - 1].cursorTime,
        id: orders[orders.length - 1].id,
      })).toString("base64url") : null,
    }, { headers });
  } catch (error) {
    console.error("Failed to load customer orders.", error);
    return Response.json({ error: "Impossibile caricare i tuoi ordini. Riprova." }, { status: 503, headers });
  }
}
