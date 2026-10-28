ALTER TABLE customers ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS google_sub TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS customers_google_sub_idx
  ON customers (google_sub)
  WHERE google_sub IS NOT NULL;
