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
      { error: "La variabile ADMIN_API_KEY non è configurata sul server." },
      { status: 503 },
    );
  }
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Il formato della richiesta JSON non è valido." },
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
    return Response.json({ error: "Lo stato dell’ordine non è valido." }, { status: 400 });
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
      { error: "Impossibile aggiornare lo stato dell’ordine." },
      { status: 500 },
    );
  }
  if (result.rowCount === 0) {
    return Response.json({ error: "Ordine non trovato." }, { status: 404 });
  }

  return Response.json({ id: id.toUpperCase(), status: result.rows[0].status });
}
