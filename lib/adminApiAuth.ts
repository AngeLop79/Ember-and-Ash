import { timingSafeEqual } from "node:crypto";

export function isAdminApiRequest(request: Request): boolean {
  const configuredKey = process.env.ADMIN_API_KEY;
  const suppliedKey = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );

  if (!configuredKey || !suppliedKey) return false;

  const configured = Buffer.from(configuredKey);
  const supplied = Buffer.from(suppliedKey);
  return (
    configured.length === supplied.length &&
    timingSafeEqual(configured, supplied)
  );
}
