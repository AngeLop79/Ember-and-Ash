import { randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCustomerSession } from "@/lib/customerAuth";
import { safeAuthDestination } from "@/lib/authRedirect";
import { getDb } from "@/lib/db";
import { normalizeItalianPhone } from "@/lib/phone";

export const runtime = "nodejs";

const STATE_COOKIE = "ember-google-oauth-state";
const VERIFIER_COOKIE = "ember-google-oauth-verifier";

type GoogleOAuthState = {
  state: string;
  next: string;
};

type GoogleTokenResponse = {
  access_token?: unknown;
};

type GoogleProfile = {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
};

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

function sameValue(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function redirectToAuth(request: Request, error: string) {
  return NextResponse.redirect(new URL(`/auth?error=${error}`, request.url));
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const cookieStore = await cookies();
  const encodedState = cookieStore.get(STATE_COOKIE)?.value;
  const verifier = cookieStore.get(VERIFIER_COOKIE)?.value;
  const authorizationCode = requestUrl.searchParams.get("code");
  const returnedState = requestUrl.searchParams.get("state");

  let state: GoogleOAuthState | null = null;
  try {
    if (encodedState) {
      state = JSON.parse(
        Buffer.from(encodedState, "base64url").toString("utf8"),
      ) as GoogleOAuthState;
    }
  } catch {
    state = null;
  }

  const clearFlowCookies = (response: NextResponse) => {
    response.cookies.set(STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });
    response.cookies.set(VERIFIER_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });
    return response;
  };

  if (
    !state ||
    typeof state.state !== "string" ||
    typeof state.next !== "string" ||
    !returnedState ||
    !sameValue(state.state, returnedState) ||
    !verifier ||
    !authorizationCode
  ) {
    return clearFlowCookies(redirectToAuth(request, "google"));
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return clearFlowCookies(redirectToAuth(request, "google_config"));
  }

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const tokenResult: unknown = await tokenResponse.json();
    if (
      !tokenResponse.ok ||
      typeof tokenResult !== "object" ||
      tokenResult === null ||
      !("access_token" in tokenResult) ||
      typeof (tokenResult as GoogleTokenResponse).access_token !== "string"
    ) {
      console.error("Google OAuth code exchange failed.", {
        status: tokenResponse.status,
      });
      return clearFlowCookies(redirectToAuth(request, "google"));
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${(tokenResult as GoogleTokenResponse).access_token}`,
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      },
    );
    const profile: unknown = await profileResponse.json();
    if (
      !profileResponse.ok ||
      typeof profile !== "object" ||
      profile === null ||
      !("sub" in profile) ||
      typeof (profile as GoogleProfile).sub !== "string" ||
      !("email" in profile) ||
      typeof (profile as GoogleProfile).email !== "string" ||
      (profile as GoogleProfile).email_verified !== true
    ) {
      console.error("Google OAuth profile was missing verified identity claims.", {
        status: profileResponse.status,
      });
      return clearFlowCookies(redirectToAuth(request, "google"));
    }

    const googleProfile = profile as GoogleProfile;
    const subject = googleProfile.sub as string;
    const email = (googleProfile.email as string).trim().toLowerCase();
    if (
      subject.length === 0 ||
      subject.length > 255 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      email.length > 254
    ) {
      return clearFlowCookies(redirectToAuth(request, "google"));
    }
    const name = typeof googleProfile.name === "string" && googleProfile.name.trim()
      ? googleProfile.name.trim().slice(0, 120)
      : email.split("@")[0].slice(0, 120);

    let result = await getDb().query<Customer>(
      `SELECT id, name, email, phone
       FROM customers
       WHERE google_sub = $1`,
      [subject],
    );
    let customer = result.rows[0];
    if (!customer) {
      result = await getDb().query<Customer>(
        `INSERT INTO customers (id, name, email, phone, password_hash, google_sub)
         VALUES ($1, $2, $3, '', NULL, $4)
         ON CONFLICT (email) DO UPDATE
         SET google_sub = EXCLUDED.google_sub
         WHERE customers.google_sub IS NULL
            OR customers.google_sub = EXCLUDED.google_sub
         RETURNING id, name, email, phone`,
        [randomUUID(), name, email, subject],
      );
      customer = result.rows[0];
      if (!customer) {
        result = await getDb().query<Customer>(
          `SELECT id, name, email, phone
           FROM customers
           WHERE google_sub = $1`,
          [subject],
        );
        customer = result.rows[0];
      }
    }
    if (!customer) {
      return clearFlowCookies(redirectToAuth(request, "google_account"));
    }

    await createCustomerSession(customer.id);
    const destination = safeAuthDestination(state.next) ?? "/";
    const target = normalizeItalianPhone(customer.phone)
      ? destination
      : `/auth?next=${encodeURIComponent(destination)}`;
    return clearFlowCookies(
      NextResponse.redirect(new URL(target, request.url)),
    );
  } catch (error) {
    console.error("Google customer authentication failed.", error);
    return clearFlowCookies(redirectToAuth(request, "google"));
  }
}
