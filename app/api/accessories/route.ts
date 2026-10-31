import { getDb } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await getDb().query<{
      enabled: boolean;
      menuItemId: string;
      accessoryId: string;
      name: string;
      description: string;
    }>(
      `SELECT s.enabled, ap.menu_item_id AS "menuItemId", a.id AS "accessoryId",
        a.name, a.description
       FROM accessory_settings s
       LEFT JOIN accessory_products ap ON TRUE
       LEFT JOIN accessories a ON a.id = ap.accessory_id AND a.available = TRUE
       LEFT JOIN accessory_product_settings ps
         ON ps.menu_item_id = ap.menu_item_id AND ps.enabled = TRUE
       WHERE s.id = 1 AND (ap.menu_item_id IS NULL OR ps.menu_item_id IS NOT NULL)
       ORDER BY ap.menu_item_id, a.name`,
    );
    const enabled = result.rows[0]?.enabled ?? false;
    const byProduct: Record<string, { id: string; name: string; description: string }[]> = {};
    if (enabled) {
      for (const row of result.rows) {
        if (!row.menuItemId || !row.accessoryId) continue;
        (byProduct[row.menuItemId] ??= []).push({
          id: row.accessoryId,
          name: row.name,
          description: row.description,
        });
      }
    }
    return Response.json({ enabled, byProduct }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to load customer accessories.", error);
    return Response.json({ error: "Impossibile caricare le personalizzazioni." }, { status: 503 });
  }
}
