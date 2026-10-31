CREATE TABLE IF NOT EXISTS accessory_settings (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO accessory_settings (id, enabled) VALUES (1, FALSE)
  ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS accessories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accessory_products (
  accessory_id TEXT NOT NULL REFERENCES accessories(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL,
  PRIMARY KEY (accessory_id, menu_item_id)
);
CREATE INDEX IF NOT EXISTS accessory_products_menu_item_idx
  ON accessory_products (menu_item_id);

CREATE TABLE IF NOT EXISTS accessory_product_settings (
  menu_item_id TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

ALTER TABLE order_items ADD COLUMN IF NOT EXISTS accessories JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO accessories (id, name, description, available) VALUES
  ('maionese', 'Maionese', '', TRUE),
  ('ketchup', 'Ketchup', '', TRUE),
  ('salsa-piccante', 'Salsa piccante', '', TRUE),
  ('salsa-peperoni', 'Salsa peperoni', '', TRUE),
  ('senape', 'Senape', '', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO accessory_products (accessory_id, menu_item_id) VALUES
  ('maionese', '1'), ('senape', '1'),
  ('maionese', '2'), ('ketchup', '2'),
  ('salsa-piccante', '2'), ('salsa-peperoni', '2')
ON CONFLICT DO NOTHING;

INSERT INTO accessory_product_settings (menu_item_id, enabled) VALUES
  ('1', TRUE), ('2', TRUE), ('9', FALSE), ('13', FALSE), ('10', FALSE), ('11', FALSE)
ON CONFLICT (menu_item_id) DO NOTHING;
