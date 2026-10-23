import {
  ADMIN_SESSION_COOKIE,
  isValidAdminSession,
  matchesAdminKey,
} from "@/lib/adminSession";
import { isSameOrigin } from "@/lib/requestOrigin";

export function isAdminApiRequest(request: Request): boolean {
  const suppliedKey = request.headers.get("authorization")?.replace(
    /^Bearer\s+/i,
    "",
  );

  if (suppliedKey !== undefined) return matchesAdminKey(suppliedKey);

  const origin = request.headers.get("origin");
  if (origin && !isSameOrigin(request)) return false;

  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`))
    ?.slice(ADMIN_SESSION_COOKIE.length + 1);
  return isValidAdminSession(token);
}
