import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";
import pg from "pg";

nextEnv.loadEnvConfig(process.cwd());
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const client = await pool.connect();
try {
  await client.query("BEGIN");
  await client.query(await readFile(new URL("../database/init.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/migrations/20261022_customer_accounts.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/migrations/20261022_cash_desk.sql", import.meta.url), "utf8"));
  await client.query(await readFile(new URL("../database/migrations/20261027_google_auth.sql", import.meta.url), "utf8"));
  await client.query("COMMIT");
  console.log("Database ready: accounts, Google login, order numbers, cash desk and WhatsApp notifications.");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Database migration failed.", error);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
