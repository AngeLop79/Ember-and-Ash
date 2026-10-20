BEGIN;

CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM schema_migrations WHERE id = '20261020_ngn_to_eur_cents'
  ) THEN
    RETURN;
  END IF;

  UPDATE order_items
  SET unit_price = ROUND(unit_price * 100.0 / 1496.85)::INTEGER;

  UPDATE orders AS o
  SET subtotal = COALESCE(
    (
      SELECT SUM(oi.unit_price * oi.quantity)::INTEGER
      FROM order_items AS oi
      WHERE oi.order_id = o.id
    ),
    ROUND(o.subtotal * 100.0 / 1496.85)::INTEGER
  ),
  delivery_fee = ROUND(o.delivery_fee * 100.0 / 1496.85)::INTEGER;

  UPDATE orders
  SET total = subtotal + delivery_fee;

  INSERT INTO schema_migrations (id)
  VALUES ('20261020_ngn_to_eur_cents');
END
$$;

COMMIT;
