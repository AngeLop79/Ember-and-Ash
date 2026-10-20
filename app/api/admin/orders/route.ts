import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!process.env.ADMIN_API_KEY) {
    return Response.json(
      { error: "ADMIN_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await getDb().query(
      `SELECT o.id, o.customer_name AS customer,
        string_agg(oi.name || ' ×' || oi.quantity, ', ' ORDER BY oi.id) AS items,
        o.total, o.order_type AS type, o.status, o.created_at AS time,
        o.customer_phone AS phone
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       GROUP BY o.id
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
              : "Delivery",
        time: new Date(order.time).toISOString(),
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to load admin orders from PostgreSQL.", error);
    return Response.json(
      { error: "Could not load orders from the database." },
      { status: 500 },
    );
  }
}
