import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { isAdminApiRequest } from "@/lib/adminApiAuth";
import { getDb } from "@/lib/db";
import { MENU_ITEMS } from "@/lib/data";

export const runtime = "nodejs";
const noStore = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  try {
    const [settings, accessories, productSettings] = await Promise.all([
      getDb().query<{ enabled: boolean }>("SELECT enabled FROM accessory_settings WHERE id = 1"),
      getDb().query<{ id: string; name: string; description: string; available: boolean; menuItemIds: string[] }>(
        `SELECT a.id, a.name, a.description, a.available,
          COALESCE(array_agg(ap.menu_item_id) FILTER (WHERE ap.menu_item_id IS NOT NULL), '{}') AS "menuItemIds"
         FROM accessories a LEFT JOIN accessory_products ap ON ap.accessory_id = a.id
         GROUP BY a.id ORDER BY a.name`,
      ),
      getDb().query<{ menuItemId: string; enabled: boolean }>(
        "SELECT menu_item_id AS \"menuItemId\", enabled FROM accessory_product_settings",
      ),
    ]);
    return Response.json({
      enabled: settings.rows[0]?.enabled ?? false,
      accessories: accessories.rows,
      products: MENU_ITEMS.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        enabled: productSettings.rows.find((product) => product.menuItemId === item.id)?.enabled ?? false,
        accessoryIds: accessories.rows
          .filter((accessory) => accessory.menuItemIds.includes(item.id))
          .map((accessory) => accessory.id),
      })),
    }, { headers: noStore });
  } catch (error) {
    console.error("Failed to load accessory settings.", error);
    return Response.json({ error: "Impossibile caricare le configurazioni degli accessori." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null || !("enabled" in body) ||
      typeof body.enabled !== "boolean" || !("products" in body) || !Array.isArray(body.products)) {
    return Response.json({ error: "Configurazione non valida." }, { status: 400 });
  }
  const menuItemIds = new Set(MENU_ITEMS.map((item) => item.id));
  const products = body.products as unknown[];
  const normalized: { id: string; enabled: boolean; accessoryIds: string[] }[] = [];
  for (const product of products) {
    if (typeof product !== "object" || product === null ||
        !("id" in product) || typeof product.id !== "string" || !menuItemIds.has(product.id) ||
        !("enabled" in product) || typeof product.enabled !== "boolean" ||
        !("accessoryIds" in product) || !Array.isArray(product.accessoryIds) ||
        !product.accessoryIds.every((id) => typeof id === "string")) {
      return Response.json({ error: "Configurazione prodotto non valida." }, { status: 400 });
    }
    normalized.push({
      id: product.id,
      enabled: product.enabled,
      accessoryIds: [...new Set(product.accessoryIds as string[])],
    });
  }
  if (normalized.length !== MENU_ITEMS.length || new Set(normalized.map(({ id }) => id)).size !== MENU_ITEMS.length) {
    return Response.json({ error: "La configurazione deve includere tutti i prodotti del menu." }, { status: 400 });
  }

  let client: PoolClient | undefined;
  try {
    client = await getDb().connect();
    await client.query("BEGIN");
    const accessoryIds = [...new Set(normalized.flatMap(({ accessoryIds }) => accessoryIds))];
    if (accessoryIds.length) {
      const existing = await client.query<{ id: string }>(
        "SELECT id FROM accessories WHERE id = ANY($1::text[])",
        [accessoryIds],
      );
      if (existing.rows.length !== accessoryIds.length) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Uno o più accessori non esistono." }, { status: 400 });
      }
    }
    await client.query("UPDATE accessory_settings SET enabled = $1 WHERE id = 1", [body.enabled]);
    for (const product of normalized) {
      await client.query(
        `INSERT INTO accessory_product_settings (menu_item_id, enabled) VALUES ($1, $2)
         ON CONFLICT (menu_item_id) DO UPDATE SET enabled = EXCLUDED.enabled`,
        [product.id, product.enabled],
      );
      await client.query("DELETE FROM accessory_products WHERE menu_item_id = $1", [product.id]);
      for (const accessoryId of product.accessoryIds) {
        await client.query(
          "INSERT INTO accessory_products (accessory_id, menu_item_id) VALUES ($1, $2)",
          [accessoryId, product.id],
        );
      }
    }
    await client.query("COMMIT");
    return Response.json({ saved: true }, { headers: noStore });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back accessory settings.", rollbackError);
      }
    }
    console.error("Failed to save accessory settings.", error);
    return Response.json({ error: "Impossibile salvare le configurazioni." }, { status: 500 });
  } finally {
    client?.release();
  }
}

export async function POST(request: Request) {
  if (!isAdminApiRequest(request)) {
    return Response.json({ error: "Accesso non autorizzato." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  }
  if (typeof body !== "object" || body === null ||
      !("name" in body) || typeof body.name !== "string" ||
      !("description" in body) || typeof body.description !== "string") {
    return Response.json({ error: "Nome e descrizione sono obbligatori." }, { status: 400 });
  }
  const name = body.name.trim();
  const description = body.description.trim();
  if (name.length < 1 || name.length > 80 || description.length > 240) {
    return Response.json({ error: "Nome o descrizione non validi." }, { status: 400 });
  }
  try {
    const id = randomUUID();
    await getDb().query(
      "INSERT INTO accessories (id, name, description, available) VALUES ($1, $2, $3, TRUE)",
      [id, name, description],
    );
    return Response.json({ id }, { status: 201, headers: noStore });
  } catch (error) {
    console.error("Failed to create accessory.", error);
    return Response.json({ error: "Impossibile creare l’accessorio." }, { status: 500 });
  }
}
