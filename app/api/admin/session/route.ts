import { cookies } from "next/headers";
import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE,
  createAdminSession,
  matchesAdminKey,
} from "@/lib/adminSession";
import { isSameOrigin } from "@/lib/requestOrigin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine della richiesta non valida." }, { status: 403 });
  }
  if (!process.env.ADMIN_API_KEY) {
    return Response.json(
      { error: "La chiave admin non è configurata sul server." },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400 });
  }
  if (
    typeof body !== "object" ||
    body === null ||
    !("key" in body) ||
    typeof body.key !== "string"
  ) {
    return Response.json({ error: "Inserisci la chiave admin." }, { status: 400 });
  }
  if (!matchesAdminKey(body.key)) {
    return Response.json({ error: "Chiave admin non valida." }, { status: 401 });
  }

  (await cookies()).set(ADMIN_SESSION_COOKIE, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });
  return Response.json({ authenticated: true }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine della richiesta non valida." }, { status: 403 });
  }
  (await cookies()).delete(ADMIN_SESSION_COOKIE);
  return Response.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
}
