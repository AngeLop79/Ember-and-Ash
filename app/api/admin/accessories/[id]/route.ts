import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  const { id } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null ||
      !("name" in body) || typeof body.name !== "string" ||
      !("description" in body) || typeof body.description !== "string" ||
      !("available" in body) || typeof body.available !== "boolean") {
    return Response.json({ error: "Dati dell’accessorio non validi." }, { status: 400 });
  }
  const name = body.name.trim();
  const description = body.description.trim();
  if (!name || name.length > 80 || description.length > 240) {
    return Response.json({ error: "Nome o descrizione non validi." }, { status: 400 });
  }
  try {
    const result = await getDb().query(
      `UPDATE accessories SET name = $2, description = $3, available = $4
       WHERE id = $1`,
      [id, name, description, body.available],
    );
    if (!result.rowCount) return Response.json({ error: "Accessorio non trovato." }, { status: 404 });
    return Response.json({ saved: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to update accessory.", error);
    return Response.json({ error: "Impossibile aggiornare l’accessorio." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const result = await getDb().query("DELETE FROM accessories WHERE id = $1", [id]);
    if (!result.rowCount) return Response.json({ error: "Accessorio non trovato." }, { status: 404 });
    return Response.json({ deleted: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Failed to delete accessory.", error);
    return Response.json({ error: "Impossibile eliminare l’accessorio." }, { status: 500 });
  }
}
