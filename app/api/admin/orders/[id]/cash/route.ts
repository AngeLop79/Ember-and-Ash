import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { changeOrder, OrderActionError, type CashAction } from "@/lib/cashDesk";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  }
  let action: CashAction;
  if (typeof body !== "object" || body === null || !("action" in body)) {
    return Response.json({ error: "Operazione non valida." }, { status: 400 });
  }
  if (body.action === "collect") {
    action = { action: "collect" };
  } else if (body.action === "pay" && "method" in body &&
    (body.method === "cash" || body.method === "card" || body.method === "transfer")) {
    action = { action: "pay", method: body.method };
  } else {
    return Response.json({ error: "Operazione o metodo di pagamento non validi." }, { status: 400 });
  }
  try {
    return Response.json(await changeOrder((await params).id, action), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof OrderActionError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Cash desk operation failed.", error);
    return Response.json({ error: "Operazione non riuscita. Aggiorna l'ordine prima di riprovare." }, { status: 503 });
  }
}
