import { getDb } from "@/lib/db";
import { getCustomer } from "@/lib/customerAuth";

export const runtime = "nodejs";

const STATUS_STEPS: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  preparing: 2,
  ready: 3,
  "out-for-delivery": 4,
  delivered: 5,
  cancelled: 0,
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let result;
  try {
    const user = await getCustomer();
    result = await getDb().query(
      `SELECT o.id, o.order_type, o.status,
        COALESCE(
          string_agg(oi.name || ' × ' || oi.quantity, ', ' ORDER BY oi.id),
          ''
        ) AS items
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.id = $1 AND (o.customer_id IS NULL OR o.customer_id = $2)
       GROUP BY o.id`,
      [id.toUpperCase(), user?.id ?? null],
    );
  } catch (error) {
    console.error("Failed to look up order in PostgreSQL.", error);
    return Response.json(
      { error: "La ricerca dell’ordine non è temporaneamente disponibile." },
      { status: 500 },
    );
  }

  const order = result.rows[0] as
    | { id: string; order_type: string; status: string; items: string }
    | undefined;
  if (!order) {
    return Response.json({ error: "Ordine non trovato." }, { status: 404 });
  }

  return Response.json({
    id: order.id,
    status: order.status,
    statusStep: STATUS_STEPS[order.status] ?? 0,
    items: order.items,
    type: order.order_type,
    eta: order.status === "delivered" ? "Delivered" : "~30–45 mins",
  }, { headers: { "Cache-Control": "no-store" } });
}
