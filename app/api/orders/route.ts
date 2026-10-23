import { createHash, randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { MENU_ITEMS } from "@/lib/data";
import { getDb } from "@/lib/db";
import { calculateDeliveryFee, formatPrice } from "@/lib/utils";
import { CartItem, CustomerInfo } from "@/types";
import { getCustomer } from "@/lib/customerAuth";
import { isSameOrigin } from "@/lib/requestOrigin";
import { sendOrderNotification } from "@/lib/whatsapp";
import { notificationMessage } from "@/lib/orderNotifications";
import { whatsappOrderNotificationsEnabled } from "@/lib/features";

export const runtime = "nodejs";

const ORDER_TYPES = ["delivery", "pickup", "dine-in"] as const;
const PAYMENT_METHODS = ["card", "cash", "transfer"] as const;

type OrderRequest = {
  items: { id: string; quantity: number; notes?: string }[];
  customer: CustomerInfo;
  type: (typeof ORDER_TYPES)[number];
  paymentMethod: (typeof PAYMENT_METHODS)[number];
  whatsappConsent: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseOrderRequest(value: unknown): OrderRequest | null {
  if (!isRecord(value) || !isRecord(value.customer)) return null;
  const { items, customer, type, paymentMethod } = value;

  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    items.length > 30 ||
    !ORDER_TYPES.includes(type as OrderRequest["type"]) ||
    !PAYMENT_METHODS.includes(paymentMethod as OrderRequest["paymentMethod"]) ||
    (value.whatsappConsent !== undefined && typeof value.whatsappConsent !== "boolean")
  ) {
    return null;
  }

  const normalizedItems: OrderRequest["items"] = [];
  for (const item of items) {
    if (
      !isRecord(item) ||
      typeof item.id !== "string" ||
      !Number.isInteger(item.quantity) ||
      (item.quantity as number) < 1 ||
      (item.quantity as number) > 100 ||
      (item.notes !== undefined &&
        (typeof item.notes !== "string" || item.notes.length > 500))
    ) {
      return null;
    }
    normalizedItems.push({
      id: item.id,
      quantity: item.quantity as number,
      notes: item.notes as string | undefined,
    });
  }

  const customerName =
    typeof customer.name === "string" ? customer.name.trim() : "";
  const phone = typeof customer.phone === "string" ? customer.phone.trim() : "";
  const email =
    typeof customer.email === "string" ? customer.email.trim() : "";
  const address =
    typeof customer.address === "string" ? customer.address.trim() : "";
  const normalizedPhone = phone.replace(/[\s()-]/g, "");

  if (
    customerName.length < 2 ||
    customerName.length > 120 ||
    phone.length < 5 ||
    phone.length > 40 ||
    email.length > 254 ||
    address.length > 500 ||
    (type === "delivery" && address.length === 0) ||
    (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) ||
    (value.whatsappConsent === true && !/^\+[1-9]\d{7,14}$/.test(normalizedPhone))
  ) {
    return null;
  }

  return {
    items: normalizedItems,
    customer: { name: customerName, phone: value.whatsappConsent ? normalizedPhone : phone, email, address },
    type: type as OrderRequest["type"],
    paymentMethod: paymentMethod as OrderRequest["paymentMethod"],
    whatsappConsent: value.whatsappConsent === true,
  };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine non valida." }, { status: 403 });
  }
  let user;
  try {
    user = await getCustomer();
  } catch (error) {
    console.error("Failed to verify order customer.", error);
    return Response.json({ error: "Impossibile verificare l'accesso. Riprova." }, { status: 503 });
  }
  if (!user) {
    return Response.json({ error: "Accedi prima di completare l'ordine." }, { status: 401 });
  }
  const requestKey = request.headers.get("Idempotency-Key");
  if (!requestKey || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(requestKey)) {
    return Response.json({ error: "Identificativo della richiesta non valido." }, { status: 400 });
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

  const order = parseOrderRequest(body);
  if (!order) {
    return Response.json(
      { error: "I dettagli dell’ordine non sono validi." },
      { status: 400 },
    );
  }

  const menuById = new Map(MENU_ITEMS.map((item) => [item.id, item]));
  const pricedItems: (CartItem & { quantity: number })[] = [];

  for (const requestedItem of order.items) {
    const menuItem = menuById.get(requestedItem.id);
    if (!menuItem || !menuItem.available) {
      return Response.json(
        { error: "Uno o più piatti selezionati non sono disponibili." },
        { status: 400 },
      );
    }
    pricedItems.push({
      ...menuItem,
      quantity: requestedItem.quantity,
      notes: requestedItem.notes,
    });
  }

  const subtotal = pricedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const deliveryFee =
    order.type === "delivery" ? calculateDeliveryFee(subtotal) : 0;
  const total = subtotal + deliveryFee;
  const notify = whatsappOrderNotificationsEnabled() && order.whatsappConsent;
  let id = `EA-${randomBytes(8).toString("hex").toUpperCase()}`;
  const requestHash = createHash("sha256").update(JSON.stringify(order)).digest("hex");
  let saved = { id, publicCode: "", total, subtotal, deliveryFee, status: "pending" };
  let existing = false;
  let client: PoolClient | undefined;

  try {
    client = await getDb().connect();
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${user.id}:${requestKey}`]);
    const previous = await client.query<{
      id: string; publicCode: string; total: number; subtotal: number; deliveryFee: number; status: string; request_hash: string;
    }>(
      `SELECT id, public_code AS "publicCode", total, subtotal, delivery_fee AS "deliveryFee", status, request_hash
       FROM orders WHERE customer_id = $1 AND request_key = $2`, [user.id, requestKey],
    );
    if (previous.rows[0]) {
      if (previous.rows[0].request_hash !== requestHash) {
        await client.query("ROLLBACK");
        return Response.json({ error: "Questa richiesta e' gia' stata usata per un ordine diverso." }, { status: 409 });
      }
      const previousOrder = previous.rows[0];
      saved = {
        id: previousOrder.id,
        publicCode: previousOrder.publicCode,
        total: previousOrder.total,
        subtotal: previousOrder.subtotal,
        deliveryFee: previousOrder.deliveryFee,
        status: previousOrder.status,
      };
      id = saved.id;
      existing = true;
    } else {
      const inserted = await client.query<{ publicCode: string }>(
        `INSERT INTO orders (
          id, customer_name, customer_phone, customer_email, customer_address,
          order_type, subtotal, delivery_fee, total, payment_method,
          customer_id, request_key, request_hash, whatsapp_consent_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING public_code AS "publicCode"`,
        [
          id,
          order.customer.name,
          order.customer.phone,
          order.customer.email || null,
          order.customer.address || null,
          order.type,
          subtotal,
          deliveryFee,
          total,
          order.paymentMethod,
          user.id,
          requestKey,
          requestHash,
          notify ? new Date() : null,
        ],
      );
      saved.publicCode = inserted.rows[0].publicCode;

      for (const item of pricedItems) {
        await client.query(
          `INSERT INTO order_items (
            order_id, menu_item_id, name, unit_price, quantity, notes
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, item.id, item.name, item.price, item.quantity, item.notes || null],
        );
      }

      if (notify) {
        const type = order.type === "delivery" ? "Consegna a domicilio" :
          order.type === "pickup" ? "Ritiro in sede" : "Consumo al ristorante";
        const parameters = [
          order.customer.name,
          id,
          pricedItems.map((item) =>
            `${item.quantity} x ${item.name} (${formatPrice(item.price * item.quantity)})${item.notes ? ` - ${item.notes}` : ""}`,
          ).join("; "),
          formatPrice(total),
          type,
          order.customer.address || "Non previsto",
          "Ricevuto, in attesa di conferma",
        ].map((text) => text.replace(/\s+/g, " ").trim());
        await client.query(
          `INSERT INTO order_notifications (order_id, recipient, parameters)
           VALUES ($1, $2, $3)`,
          [id, order.customer.phone.replace(/^\+/, ""), JSON.stringify(parameters)],
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Failed to roll back order transaction.", rollbackError);
      }
    }
    console.error("Failed to save order to PostgreSQL.", error);
    return Response.json(
      { error: "Non è stato possibile salvare l’ordine. Riprova." },
      { status: 500 },
    );
  } finally {
    client?.release();
  }

  let notification: string | undefined;
  try {
    if (whatsappOrderNotificationsEnabled()) {
      notification = notify
        ? notificationMessage(await sendOrderNotification(id))
        : notificationMessage(null);
    }
  } catch (error) {
    console.error("Order saved but WhatsApp outcome could not be recorded.", { orderId: id, error });
    notification = "Ordine salvato. Esito WhatsApp non disponibile: non ripetere l'ordine.";
  }
  return Response.json({ ...saved, notification }, {
    status: existing ? 200 : 201,
    headers: { "Cache-Control": "no-store" },
  });
}
