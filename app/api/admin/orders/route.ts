import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.ADMIN_API_KEY) {
    return Response.json(
      { error: "La variabile ADMIN_API_KEY non è configurata sul server." },
      { status: 503 },
    );
  }
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }

  try {
    const result = await getDb().query(
      `SELECT o.id, o.public_code AS "publicCode", o.payment_status AS "paymentStatus", o.customer_name AS customer,
        (SELECT string_agg(
          oi.name || ' ×' || oi.quantity ||
            CASE WHEN jsonb_array_length(oi.accessories) > 0
              THEN ' [' || (SELECT string_agg(extra->>'name', ', ')
                            FROM jsonb_array_elements(oi.accessories) AS extras(extra)) || ']'
              ELSE '' END,
          ', ' ORDER BY oi.id
        ) FROM order_items oi WHERE oi.order_id = o.id) AS items,
        o.total, o.order_type AS type, o.status, o.created_at AS time,
        o.customer_phone AS phone, n.status AS "whatsappStatus"
       FROM orders o
       LEFT JOIN order_notifications n ON n.order_id = o.id
       GROUP BY o.id, n.status
       ORDER BY o.created_at DESC
       LIMIT 100`,
    );

    return Response.json({
      orders: result.rows.map((order) => ({
        ...order,
        type:
          order.type === "dine-in"
            ? "Dine-In"
            : order.type === "pickup"
              ? "Pickup"
              : "Ordine precedente",
        time: new Date(order.time).toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load admin orders from PostgreSQL.", error);
    return Response.json(
      { error: "Impossibile caricare gli ordini dal database." },
      { status: 500 },
    );
  }
}
