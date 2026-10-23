import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

const COOKIE = "ember-customer-session";
const MAX_AGE = 60 * 60 * 24 * 7;

export type CustomerUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function derive(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await derive(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, hash] = stored.split(":");
  if (algorithm !== "scrypt" || !salt || !hash || !/^[a-f0-9]{128}$/.test(hash)) {
    throw new Error("Invalid password hash in customer record.");
  }
  return timingSafeEqual(await derive(password, salt), Buffer.from(hash, "hex"));
}

export async function allowAuthAttempt(email: string): Promise<boolean> {
  const result = await getDb().query<{ attempts: number }>(
    `INSERT INTO auth_attempts (key_hash, attempts, expires_at)
     VALUES ($1, 1, NOW() + INTERVAL '15 minutes')
     ON CONFLICT (key_hash) DO UPDATE SET
       attempts = CASE WHEN auth_attempts.expires_at <= NOW() THEN 1 ELSE auth_attempts.attempts + 1 END,
       expires_at = CASE WHEN auth_attempts.expires_at <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE auth_attempts.expires_at END
     RETURNING attempts`,
    [digest(email)],
  );
  return result.rows[0].attempts <= 10;
}

export async function createCustomerSession(customerId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  await getDb().query(
    `INSERT INTO customer_sessions (token_hash, customer_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [digest(token), customerId],
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function getCustomer(): Promise<CustomerUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const result = await getDb().query<CustomerUser>(
    `SELECT c.id, c.name, c.email, c.phone
     FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
     WHERE s.token_hash = $1 AND s.expires_at > NOW()`,
    [digest(token)],
  );
  return result.rows[0] ?? null;
}

export async function deleteCustomerSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) {
    await getDb().query("DELETE FROM customer_sessions WHERE token_hash = $1", [digest(token)]);
  }
  store.delete(COOKIE);
}
