import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_SESSION_COOKIE = "ember-admin-session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("hex");
}

export function matchesAdminKey(suppliedKey: string): boolean {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!configuredKey || !suppliedKey) return false;

  const configured = Buffer.from(configuredKey);
  const supplied = Buffer.from(suppliedKey);
  return (
    configured.length === supplied.length &&
    timingSafeEqual(configured, supplied)
  );
}

export function createAdminSession(): string {
  const key = process.env.ADMIN_API_KEY;
  if (!key) throw new Error("ADMIN_API_KEY is required to create an admin session.");

  const expires = Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE;
  const payload = `${expires}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload, key)}`;
}

export function isValidAdminSession(token: string | undefined): boolean {
  const key = process.env.ADMIN_API_KEY;
  if (!key || !token) return false;

  const match = /^(\d+)\.([a-f0-9]{32})\.([a-f0-9]{64})$/.exec(token);
  if (!match || Number(match[1]) <= Math.floor(Date.now() / 1000)) return false;

  const expected = sign(`${match[1]}.${match[2]}`, key);
  return timingSafeEqual(Buffer.from(match[3]), Buffer.from(expected));
}
