CREATE SEQUENCE IF NOT EXISTS order_public_number_seq;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_number BIGINT
  NOT NULL DEFAULT nextval('order_public_number_seq');
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_number_idx ON orders(public_number);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS public_code TEXT
  GENERATED ALWAYS AS (
    'A-' || lpad(public_number::text, greatest(3, length(public_number::text)), '0')
  ) STORED;
CREATE UNIQUE INDEX IF NOT EXISTS orders_public_code_idx ON orders(public_code);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS received_payment_method TEXT
  CHECK (received_payment_method IN ('cash', 'card', 'transfer'));
