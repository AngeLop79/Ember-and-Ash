import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { safeAuthDestination } from "@/lib/authRedirect";

export const runtime = "nodejs";

const STATE_COOKIE = "ember-google-oauth-state";
const VERIFIER_COOKIE = "ember-google-oauth-verifier";

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !process.env.GOOGLE_CLIENT_SECRET || !redirectUri) {
    return NextResponse.redirect(new URL("/auth?error=google_config", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(verifier).digest("base64url");
  const next = safeAuthDestination(new URL(request.url).searchParams.get("next")) ?? "/";
  const stateCookie = Buffer.from(JSON.stringify({ state, next })).toString("base64url");
  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    include_granted_scopes: "true",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/google",
    maxAge: 600,
  };
  response.cookies.set(STATE_COOKIE, stateCookie, cookieOptions);
  response.cookies.set(VERIFIER_COOKIE, verifier, cookieOptions);
  return response;
}
