export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  return origin === `${url.protocol}//${host}`;
}
