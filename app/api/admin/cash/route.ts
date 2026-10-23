import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length > 120) {
    return Response.json({ error: "Ricerca troppo lunga." }, { status: 400 });
  }
  const escaped = query.replace(/[\\%_]/g, "\\$&");
  try {
    const result = await getDb().query(
      `SELECT id, public_code AS "publicCode", customer_name AS customer,
       order_type AS type, total, status, payment_status AS "paymentStatus",
       created_at AS "createdAt"
       FROM orders
       WHERE ($1 = '' OR public_code ILIKE $2 OR customer_name ILIKE $2 OR id = upper($1))
       ORDER BY CASE WHEN public_code = upper($1) THEN 0 ELSE 1 END,
         created_at DESC, id DESC LIMIT 51`,
      [query, `%${escaped}%`],
    );
    return Response.json({ orders: result.rows.slice(0, 50), hasMore: result.rows.length > 50 }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Cash desk search failed.", error);
    return Response.json({ error: "Ricerca non disponibile. Riprova." }, { status: 503 });
  }
}
