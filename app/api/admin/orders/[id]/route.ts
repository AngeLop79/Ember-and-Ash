import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out-for-delivery",
  "delivered",
  "cancelled",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!process.env.ADMIN_API_KEY) {
    return Response.json(
      { error: "ADMIN_API_KEY is not configured on the server." },
      { status: 503 },
    );
  }
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON request body." },
      { status: 400 },
    );
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("status" in body) ||
    typeof body.status !== "string" ||
    !ORDER_STATUSES.includes(body.status as (typeof ORDER_STATUSES)[number])
  ) {
    return Response.json({ error: "Invalid order status." }, { status: 400 });
  }

  const { id } = await params;
  let result;
  try {
    result = await getDb().query(
      "UPDATE orders SET status = $1 WHERE id = $2 RETURNING status",
      [body.status, id.toUpperCase()],
    );
  } catch (error) {
    console.error("Failed to update order status in PostgreSQL.", error);
    return Response.json(
      { error: "Could not update order status." },
      { status: 500 },
    );
  }
  if (result.rowCount === 0) {
    return Response.json({ error: "Order not found." }, { status: 404 });
  }

  return Response.json({ id: id.toUpperCase(), status: result.rows[0].status });
}
