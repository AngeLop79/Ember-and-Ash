import { getDb } from "@/lib/db";
import type { OrderStatus } from "@/types";

export type OrderDetails = {
  id: string;
  publicCode: string;
  customerId: string | null;
  customer: string;
  status: OrderStatus;
  type: "delivery" | "pickup" | "dine-in";
  total: number;
  subtotal: number;
  deliveryFee: number;
  paymentStatus: "pending" | "paid" | "failed";
  paidAt: Date | null;
  collectedAt: Date | null;
  receivedPaymentMethod: "cash" | "card" | "transfer" | null;
  createdAt: Date;
  address: string | null;
  items: { name: string; quantity: number; unitPrice: number; notes: string | null }[];
};

export async function getOrderDetails(id: string): Promise<OrderDetails | null> {
  const result = await getDb().query<OrderDetails>(
    `SELECT o.id, o.public_code AS "publicCode", o.customer_id AS "customerId",
      o.customer_name AS customer, o.status, o.order_type AS type, o.total, o.subtotal,
      o.delivery_fee AS "deliveryFee", o.payment_status AS "paymentStatus",
      o.paid_at AS "paidAt", o.collected_at AS "collectedAt",
      o.received_payment_method AS "receivedPaymentMethod",
      o.created_at AS "createdAt", o.customer_address AS address,
      COALESCE(json_agg(json_build_object(
        'name', i.name, 'quantity', i.quantity, 'unitPrice', i.unit_price, 'notes', i.notes
      ) ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items
     FROM orders o LEFT JOIN order_items i ON i.order_id = o.id
     WHERE o.id = $1 GROUP BY o.id`,
    [id.toUpperCase()],
  );
  return result.rows[0] ?? null;
}
