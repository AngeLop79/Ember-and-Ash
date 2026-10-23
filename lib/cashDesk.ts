import { getDb } from "@/lib/db";
import type { OrderDetails } from "@/lib/orders";
import type { OrderStatus } from "@/types";
import { isOrderCollectable } from "@/lib/orderDisplay";

export type CashAction =
  | { action: "pay"; method: "cash" | "card" | "transfer" }
  | { action: "collect" };

export class OrderActionError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "out-for-delivery",
};

export async function changeOrder(
  id: string,
  operation: CashAction | { status: OrderStatus },
) {
  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query<{
      id: string;
      status: OrderStatus;
      order_type: string;
      payment_status: string;
      received_payment_method: OrderDetails["receivedPaymentMethod"];
    }>("SELECT id, status, order_type, payment_status, received_payment_method FROM orders WHERE id = $1 FOR UPDATE", [id.toUpperCase()]);
    const order = result.rows[0];
    if (!order) throw new OrderActionError("Ordine non trovato.", 404);
    let alreadyProcessed = false;
    if ("action" in operation && operation.action === "pay") {
      if (order.status === "cancelled") throw new OrderActionError("Un ordine annullato non puo' essere incassato.", 409);
      if (order.payment_status === "paid") {
        if (order.received_payment_method && order.received_payment_method !== operation.method) {
          throw new OrderActionError("Pagamento gia' registrato con un altro metodo.", 409);
        }
        alreadyProcessed = true;
      } else {
        await client.query(
          `UPDATE orders SET payment_status = 'paid', paid_at = NOW(),
           received_payment_method = $2 WHERE id = $1`, [order.id, operation.method],
        );
      }
    } else {
      const target = "action" in operation ? "delivered" : operation.status;
      if (order.status === target) {
        alreadyProcessed = true;
      } else if (target === "delivered") {
        if (order.payment_status !== "paid") {
          throw new OrderActionError("Registra il pagamento prima della consegna o del ritiro.", 409);
        }
        if (!isOrderCollectable(order.status, order.order_type)) {
          throw new OrderActionError(
            order.order_type === "delivery" ? "L'ordine deve essere in consegna." : "L'ordine deve essere pronto per il ritiro.",
            409,
          );
        }
        await client.query(
          "UPDATE orders SET status = 'delivered', collected_at = NOW() WHERE id = $1", [order.id],
        );
      } else if (target === "cancelled") {
        if (order.status === "delivered" || order.payment_status === "paid") {
          throw new OrderActionError("Ordine pagato o gia' consegnato: l'annullamento richiede una gestione rimborso separata.", 409);
        }
        await client.query("UPDATE orders SET status = 'cancelled' WHERE id = $1", [order.id]);
      } else {
        if (NEXT_STATUS[order.status] !== target ||
            (target === "out-for-delivery" && order.order_type !== "delivery")) {
          throw new OrderActionError("Passaggio di stato non consentito.", 409);
        }
        await client.query("UPDATE orders SET status = $2 WHERE id = $1", [order.id, target]);
      }
    }
    const updated = await client.query(
      `SELECT id, status, payment_status AS "paymentStatus", paid_at AS "paidAt",
       collected_at AS "collectedAt", received_payment_method AS "receivedPaymentMethod"
       FROM orders WHERE id = $1`, [order.id],
    );
    await client.query("COMMIT");
    return { ...updated.rows[0], alreadyProcessed };
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("Failed to roll back cash desk operation.", rollbackError);
    }
    throw error;
  } finally {
    client.release();
  }
}
