import { randomUUID } from "node:crypto";
import {
  allowAuthAttempt,
  createCustomerSession,
  deleteCustomerSession,
  getCustomer,
  hashPassword,
  verifyPassword,
  type CustomerUser,
} from "@/lib/customerAuth";
import { getDb } from "@/lib/db";
import { isSameOrigin } from "@/lib/requestOrigin";
import { normalizeItalianPhone } from "@/lib/phone";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    return Response.json({ user: await getCustomer() }, { headers });
  } catch (error) {
    console.error("Failed to read customer session.", error);
    return Response.json({ error: "Impossibile verificare la sessione." }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine non valida." }, { status: 403, headers });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400, headers });
  }
  if (
    typeof body !== "object" || body === null ||
    !("mode" in body) || (body.mode !== "signin" && body.mode !== "signup") ||
    !("email" in body) || typeof body.email !== "string" ||
    !("password" in body) || typeof body.password !== "string"
  ) {
    return Response.json({ error: "Inserisci email e password." }, { status: 400, headers });
  }
  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (
    email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 10 || password.length > 128
  ) {
    return Response.json({ error: "Email non valida o password non compresa tra 10 e 128 caratteri." }, { status: 400, headers });
  }
  try {
    if (!(await allowAuthAttempt(email))) {
      return Response.json(
        { error: "Troppi tentativi. Riprova tra 15 minuti." },
        { status: 429, headers: { ...headers, "Retry-After": "900" } },
      );
    }
    let user: CustomerUser;
    if (body.mode === "signup") {
      const name = "name" in body && typeof body.name === "string" ? body.name.trim() : "";
      const rawPhone = "phone" in body && typeof body.phone === "string" ? body.phone : "";
      const phone = normalizeItalianPhone(rawPhone);
      if (name.length < 2 || name.length > 120 || !phone) {
        return Response.json({ error: "Nome o numero di telefono italiano non validi. Inserisci il prefisso +39 e da 6 a 11 cifre." }, { status: 400, headers });
      }
      const result = await getDb().query<CustomerUser>(
        `INSERT INTO customers (id, name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO NOTHING RETURNING id, name, email, phone`,
        [randomUUID(), name, email, phone, await hashPassword(password)],
      );
      if (!result.rows[0]) {
        return Response.json({ error: "Impossibile registrare questa email. Prova ad accedere." }, { status: 409, headers });
      }
      user = result.rows[0];
    } else {
      const result = await getDb().query<CustomerUser & { password_hash: string | null }>(
        "SELECT id, name, email, phone, password_hash FROM customers WHERE email = $1", [email],
      );
      const account = result.rows[0];
      // Perform the same expensive derivation even when the email does not exist.
      const hash = account?.password_hash ??
        `scrypt:${"0".repeat(32)}:${"0".repeat(128)}`;
      const valid = await verifyPassword(password, hash);
      if (!account || !account.password_hash || !valid) {
        return Response.json({ error: "Email o password non corrette." }, { status: 401, headers });
      }
      user = { id: account.id, name: account.name, email: account.email, phone: account.phone };
    }
    await createCustomerSession(user.id);
    return Response.json({ user }, { status: body.mode === "signup" ? 201 : 200, headers });
  } catch (error) {
    console.error("Customer authentication failed.", error);
    return Response.json({ error: "Accesso temporaneamente non disponibile. Riprova." }, { status: 503, headers });
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine non valida." }, { status: 403, headers });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Richiesta JSON non valida." }, { status: 400, headers });
  }
  if (
    typeof body !== "object" || body === null ||
    !("phone" in body) || typeof body.phone !== "string"
  ) {
    return Response.json({ error: "Inserisci un numero di telefono italiano." }, { status: 400, headers });
  }
  const phone = normalizeItalianPhone(body.phone);
  if (!phone) {
    return Response.json({ error: "Inserisci il prefisso +39 e da 6 a 11 cifre." }, { status: 400, headers });
  }
  try {
    const user = await getCustomer();
    if (!user) {
      return Response.json({ error: "Accedi per completare il profilo." }, { status: 401, headers });
    }
    const result = await getDb().query<CustomerUser>(
      "UPDATE customers SET phone = $1 WHERE id = $2 RETURNING id, name, email, phone",
      [phone, user.id],
    );
    if (!result.rows[0]) {
      return Response.json({ error: "Account cliente non trovato." }, { status: 404, headers });
    }
    return Response.json({ user: result.rows[0] }, { headers });
  } catch (error) {
    console.error("Failed to complete customer profile.", error);
    return Response.json({ error: "Impossibile salvare il numero di telefono." }, { status: 503, headers });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origine non valida." }, { status: 403, headers });
  }
  try {
    await deleteCustomerSession();
    return Response.json({ user: null }, { headers });
  } catch (error) {
    console.error("Failed to end customer session.", error);
    return Response.json({ error: "Impossibile uscire. Riprova." }, { status: 503, headers });
  }
}
