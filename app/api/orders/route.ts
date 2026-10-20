import { randomBytes } from "node:crypto";
import type { PoolClient } from "pg";
import { MENU_ITEMS } from "@/lib/data";
import { getDb } from "@/lib/db";
import { calculateDeliveryFee } from "@/lib/utils";
import { CartItem, CustomerInfo } from "@/types";

export const runtime = "nodejs";

const ORDER_TYPES = ["delivery", "pickup", "dine-in"] as const;
const PAYMENT_METHODS = ["card", "cash", "transfer"] as const;

type OrderRequest = {
  items: { id: string; quantity: number; notes?: string }[];
  customer: CustomerInfo;
  type: (typeof ORDER_TYPES)[number];
  paymentMethod: (typeof PAYMENT_METHODS)[number];
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
    !PAYMENT_METHODS.includes(paymentMethod as OrderRequest["paymentMethod"])
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

  if (
    customerName.length < 2 ||
    customerName.length > 120 ||
    phone.length < 5 ||
    phone.length > 40 ||
    email.length > 254 ||
    address.length > 500 ||
    (type === "delivery" && address.length === 0) ||
    (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  ) {
    return null;
  }

  return {
    items: normalizedItems,
    customer: { name: customerName, phone, email, address },
    type: type as OrderRequest["type"],
    paymentMethod: paymentMethod as OrderRequest["paymentMethod"],
  };
}

export async function POST(request: Request) {
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
  const id = `EA-${randomBytes(8).toString("hex").toUpperCase()}`;
  let client: PoolClient | undefined;

  try {
    client = await getDb().connect();
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO orders (
        id, customer_name, customer_phone, customer_email, customer_address,
        order_type, subtotal, delivery_fee, total, payment_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
      ],
    );

    for (const item of pricedItems) {
      await client.query(
        `INSERT INTO order_items (
          order_id, menu_item_id, name, unit_price, quantity, notes
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, item.id, item.name, item.price, item.quantity, item.notes || null],
      );
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

  return Response.json(
    { id, total, subtotal, deliveryFee, status: "pending" },
    { status: 201 },
  );
}
