import test from "node:test";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import nextEnv from "@next/env";
import pg from "pg";

test("customer accounts, ownership, pagination, idempotence and session revocation", {
  skip: !process.env.TEST_BASE_URL,
  timeout: 60000,
}, async () => {
  nextEnv.loadEnvConfig(process.cwd());
  const base = process.env.TEST_BASE_URL;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const suffix = randomUUID();
  const emails = [`customer-a-${suffix}@example.invalid`, `customer-b-${suffix}@example.invalid`];
  const rateEmail = `rate-${suffix}@example.invalid`;
  const users = [];
  const headers = { Origin: base, "Content-Type": "application/json" };
  const postAuth = (body, cookie) => fetch(`${base}/api/auth`, {
    method: "POST", headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
  try {
    for (const email of emails) {
      const response = await postAuth({ mode: "signup", name: "Customer Integration Test", email, phone: "3201234567", password: "Long-test-password-123" });
      assert.equal(response.status, 201);
      const { user } = await response.json();
      assert.equal(user.password_hash, undefined);
      assert.equal(user.phone, "+393201234567");
      const setCookie = response.headers.get("set-cookie");
      assert.match(setCookie, /HttpOnly/i);
      users.push({ ...user, cookie: setCookie.split(";")[0] });
    }
    const invalidPhone = await postAuth({
      mode: "signup",
      name: "Customer Integration Test",
      email: `invalid-phone-${suffix}@example.invalid`,
      phone: "123",
      password: "Long-test-password-123",
    });
    assert.equal(invalidPhone.status, 400);
    const [a, b] = users;
    const profileUpdate = await fetch(`${base}/api/auth`, {
      method: "PATCH",
      headers: { ...headers, Cookie: a.cookie },
      body: JSON.stringify({ phone: "+39 333 765 4321" }),
    });
    assert.equal(profileUpdate.status, 200);
    assert.equal((await profileUpdate.json()).user.phone, "+393337654321");
    const featureResponse = await fetch(`${base}/api/features`);
    const whatsappEnabled = (await featureResponse.json()).whatsappOrderNotifications;
    assert.equal(typeof whatsappEnabled, "boolean");
    let response = await postAuth({ mode: "signin", email: emails[0], password: "Incorrect-password" });
    assert.equal(response.status, 401);
    response = await postAuth({ mode: "signin", email: emails[0].toUpperCase(), password: "Long-test-password-123" });
    assert.equal(response.status, 200);
    const secondDevice = response.headers.get("set-cookie").split(";")[0];
    response = await fetch(`${base}/api/orders/mine`);
    assert.equal(response.status, 401);

    const key = randomUUID();
    const body = {
      items: [{ id: "1", quantity: 2 }],
      customer: { name: "Test Buyer", phone: "+390000000000", email: emails[1] },
      customer_id: b.id,
      type: "pickup", paymentMethod: "cash", whatsappConsent: false,
    };
    const place = (cookie, requestKey = key, data = body) => fetch(`${base}/api/orders`, {
      method: "POST",
      headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}), "Idempotency-Key": requestKey },
      body: JSON.stringify(data),
    });
    response = await place(null);
    assert.equal(response.status, 401);
    response = await place(a.cookie, randomUUID(), { ...body, whatsappConsent: true, customer: { ...body.customer, phone: "123" } });
    assert.equal(response.status, 400);
    const responses = await Promise.all([place(a.cookie), place(a.cookie), place(a.cookie)]);
    assert.deepEqual(responses.map((r) => r.status).sort(), [200, 200, 201]);
    const orders = await Promise.all(responses.map((r) => r.json()));
    const order = orders[0];
    assert.ok(orders.every((o) => o.id === order.id));
    assert.match(order.publicCode, /^A-\d{3,}$/);
    assert.ok(orders.every((o) => o.publicCode === order.publicCode));
    assert.equal(order.total, 2000);
    if (whatsappEnabled) assert.match(order.notification, /non richiesto/);
    else assert.equal(order.notification, undefined);
    const stored = await pool.query("SELECT customer_id, whatsapp_consent_at FROM orders WHERE id = $1", [order.id]);
    assert.equal(stored.rows[0].customer_id, a.id);
    assert.equal(stored.rows[0].whatsapp_consent_at, null);
    assert.equal((await pool.query("SELECT * FROM order_notifications WHERE order_id = $1", [order.id])).rowCount, 0);
    response = await place(a.cookie, key, { ...body, type: "dine-in" });
    assert.equal(response.status, 409);
    response = await fetch(`${base}/api/orders/${order.id}`, { headers: { Cookie: b.cookie } });
    assert.equal(response.status, 404);
    response = await fetch(`${base}/api/orders/${order.id}`);
    assert.equal(response.status, 404);
    response = await fetch(`${base}/api/orders/${order.id}`, { headers: { Cookie: secondDevice } });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/api/orders/mine?customer_id=${a.id}`, { headers: { Cookie: b.cookie } });
    assert.deepEqual((await response.json()).orders, []);

    response = await fetch(`${base}/orders/${order.id}`, { redirect: "manual" });
    assert.equal(response.status, 307);
    assert.match(response.headers.get("location"), /\/auth\?next=/);
    response = await fetch(`${base}/orders/${order.id}`, { headers: { Cookie: b.cookie } });
    assert.equal(response.status, 404);
    response = await fetch(`${base}/orders/${order.id}`, { headers: { Cookie: a.cookie } });
    assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(order.publicCode));
    response = await fetch(`${base}/admin/cash`, { redirect: "manual" });
    assert.equal(response.status, 307);
    response = await fetch(`${base}/api/admin/cash?q=${order.publicCode}`);
    assert.equal(response.status, 401);
    response = await fetch(`${base}/api/admin/orders/${order.id}/cash`, {
      method: "POST", headers: { ...headers, Cookie: a.cookie },
      body: JSON.stringify({ action: "pay", method: "cash" }),
    });
    assert.equal(response.status, 401);

    if (process.env.ADMIN_API_KEY) {
      const staffHeaders = { ...headers, Authorization: `Bearer ${process.env.ADMIN_API_KEY}` };
      const staffFetch = (path, data, method = "POST") => fetch(`${base}${path}`, {
        method, headers: staffHeaders, body: JSON.stringify(data),
      });
      const cashPath = `/api/admin/orders/${order.id}/cash`;
      const statePath = `/api/admin/orders/${order.id}`;
      const state = (status) => staffFetch(statePath, { status }, "PATCH");
      const cash = (data) => staffFetch(cashPath, data);
      response = await fetch(`${base}/api/admin/cash?q=${order.publicCode}`, { headers: staffHeaders });
      assert.equal(response.status, 200);
      assert.equal((await response.json()).orders[0].id, order.id);
      response = await fetch(`${base}/api/admin/cash?q=${encodeURIComponent("'; DROP TABLE orders;--")}`, { headers: staffHeaders });
      assert.equal(response.status, 200);
      assert.deepEqual((await response.json()).orders, []);
      assert.equal((await cash({ action: "collect" })).status, 409);
      assert.equal((await state("delivered")).status, 409);
      assert.equal((await state("ready")).status, 409);
      assert.equal((await state("confirmed")).status, 200);
      assert.equal((await state("preparing")).status, 200);
      assert.equal((await state("ready")).status, 200);
      assert.equal((await state("out-for-delivery")).status, 409);
      assert.equal((await state("delivered")).status, 409);
      assert.equal((await cash({ action: "pay", method: "invalid" })).status, 400);
      const payResults = await Promise.all([cash({ action: "pay", method: "cash" }), cash({ action: "pay", method: "cash" })]);
      assert.ok(payResults.every((r) => r.status === 200));
      assert.deepEqual((await Promise.all(payResults.map((r) => r.json()))).map((r) => r.alreadyProcessed).sort(), [false, true]);
      const firstPayment = (await pool.query("SELECT paid_at FROM orders WHERE id = $1", [order.id])).rows[0].paid_at;
      assert.ok(firstPayment);
      assert.equal((await cash({ action: "pay", method: "card" })).status, 409);
      assert.equal((await state("cancelled")).status, 409);
      const collectResults = await Promise.all([cash({ action: "collect" }), cash({ action: "collect" })]);
      assert.ok(collectResults.every((r) => r.status === 200));
      assert.deepEqual((await Promise.all(collectResults.map((r) => r.json()))).map((r) => r.alreadyProcessed).sort(), [false, true]);
      const completed = (await pool.query("SELECT payment_status, status, paid_at, collected_at FROM orders WHERE id = $1", [order.id])).rows[0];
      assert.equal(completed.status, "delivered");
      assert.equal(completed.payment_status, "paid");
      assert.equal(completed.paid_at.toISOString(), firstPayment.toISOString());
      assert.ok(completed.collected_at);
      assert.equal((await state("ready")).status, 409);
      assert.equal((await state("cancelled")).status, 409);

      response = await place(a.cookie, randomUUID());
      const cancelled = await response.json();
      assert.notEqual(cancelled.publicCode, order.publicCode);
      assert.equal((await staffFetch(`/api/admin/orders/${cancelled.id}`, { status: "cancelled" }, "PATCH")).status, 200);
      assert.equal((await staffFetch(`/api/admin/orders/${cancelled.id}/cash`, { action: "pay", method: "cash" })).status, 409);
      assert.equal((await staffFetch(`/api/admin/orders/${cancelled.id}/cash`, { action: "collect" })).status, 409);
      await pool.query("DELETE FROM orders WHERE id = $1", [cancelled.id]);

      for (const type of ["delivery", "dine-in"]) {
        response = await place(a.cookie, randomUUID(), {
          ...body, type, customer: { ...body.customer, address: type === "delivery" ? "Via Roma 1" : "" },
        });
        assert.equal(response.status, 201);
        const variant = await response.json();
        const variantState = (status) => staffFetch(`/api/admin/orders/${variant.id}`, { status }, "PATCH");
        const variantCash = (data) => staffFetch(`/api/admin/orders/${variant.id}/cash`, data);
        for (const status of ["confirmed", "preparing", "ready"]) {
          assert.equal((await variantState(status)).status, 200);
        }
        assert.equal((await variantCash({ action: "pay", method: "card" })).status, 200);
        if (type === "delivery") {
          assert.equal((await variantCash({ action: "collect" })).status, 409);
          assert.equal((await variantState("delivered")).status, 409);
          assert.equal((await variantState("out-for-delivery")).status, 200);
          assert.equal((await variantState("delivered")).status, 200);
        } else {
          assert.equal((await variantState("out-for-delivery")).status, 409);
          // Legacy pickup/dine-in orders could enter the old universal courier step.
          await pool.query("UPDATE orders SET status = 'out-for-delivery' WHERE id = $1", [variant.id]);
          assert.equal((await variantCash({ action: "collect" })).status, 200);
        }
        const fulfilled = (await pool.query("SELECT collected_at FROM orders WHERE id = $1", [variant.id])).rows[0];
        assert.ok(fulfilled.collected_at);
        await pool.query("DELETE FROM orders WHERE id = $1", [variant.id]);
      }

      response = await staffFetch("/api/admin/session", { key: process.env.ADMIN_API_KEY });
      assert.equal(response.status, 200);
      const staffCookie = response.headers.get("set-cookie").split(";")[0];
      response = await fetch(`${base}/admin/cash/${order.id}`, { headers: { Cookie: staffCookie } });
      assert.equal(response.status, 200);
      response = await fetch(`${base}/orders/${order.id}`, { headers: { Cookie: staffCookie } });
      assert.equal(response.status, 200);
      response = await fetch(`${base}/api/admin/orders/${order.id}/cash`, {
        method: "POST", headers: { ...headers, Cookie: staffCookie, Origin: "https://evil.invalid" },
        body: JSON.stringify({ action: "collect" }),
      });
      assert.equal(response.status, 401);
    }

    // Equal timestamps test stable keyset pagination, including microseconds.
    for (let i = 0; i < 23; i++) {
      await pool.query(
        `INSERT INTO orders (id, customer_id, customer_name, customer_phone, order_type,
          subtotal, delivery_fee, total, payment_method, created_at)
         VALUES ($1, $2, 'Test', '00000', 'pickup', 100, 0, 100, 'cash', '2025-01-01 10:00:00.123456+00')`,
        [`TEST-${suffix}-${String(i).padStart(2, "0")}`, a.id],
      );
    }
    let cursor = null;
    const seen = [];
    const publicCodes = [];
    do {
      response = await fetch(`${base}/api/orders/mine${cursor ? `?before=${encodeURIComponent(cursor)}` : ""}`, {
        headers: { Cookie: secondDevice },
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      const page = await response.json();
      seen.push(...page.orders.map((item) => item.id));
      publicCodes.push(...page.orders.map((item) => item.publicCode));
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(seen.length, 24);
    assert.equal(new Set(seen).size, 24);
    assert.equal(new Set(publicCodes).size, 24);
    assert.ok(publicCodes.every((code) => /^A-\d{3,}$/.test(code)));
    const whatsappConfigured = [
      "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_API_VERSION",
      "WHATSAPP_ORDER_TEMPLATE", "WHATSAPP_TEMPLATE_LANGUAGE",
    ].every((name) => Boolean(process.env[name]));
    if (whatsappEnabled && !whatsappConfigured) {
      response = await place(a.cookie, randomUUID(), { ...body, whatsappConsent: true });
      assert.equal(response.status, 201);
      const notifiedOrder = await response.json();
      assert.match(notifiedOrder.notification, /non ancora configurato/);
      const notification = await pool.query(
        `SELECT n.*, o.whatsapp_consent_at FROM order_notifications n
         JOIN orders o ON o.id = n.order_id WHERE n.order_id = $1`, [notifiedOrder.id],
      );
      assert.equal(notification.rows[0].status, "not_configured");
      assert.ok(notification.rows[0].whatsapp_consent_at);
      assert.equal(notification.rows[0].parameters.length, 7);
      assert.equal(notification.rows[0].parameters[1], notifiedOrder.id);
      assert.match(notification.rows[0].parameters[2], /2 x/);
      response = await fetch(`${base}/api/admin/orders/${notifiedOrder.id}/notification`, { method: "POST", headers });
      assert.equal(response.status, 401);
      if (process.env.ADMIN_API_KEY) {
        const retryHeaders = { ...headers, Authorization: `Bearer ${process.env.ADMIN_API_KEY}` };
        response = await fetch(`${base}/api/admin/orders/${notifiedOrder.id}/notification`, {
          method: "POST", headers: retryHeaders,
        });
        assert.equal(response.status, 200);
        assert.equal((await response.json()).status, "not_configured");
        await pool.query("UPDATE order_notifications SET status = 'accepted' WHERE order_id = $1", [notifiedOrder.id]);
        response = await fetch(`${base}/api/admin/orders/${notifiedOrder.id}/notification`, {
          method: "POST", headers: retryHeaders,
        });
        assert.equal(response.status, 409);
      }
    }
    if (!whatsappEnabled) {
        response = await place(a.cookie, randomUUID(), { ...body, whatsappConsent: true });
        assert.equal(response.status, 201);
        const disabledOrder = await response.json();
        assert.equal(disabledOrder.notification, undefined);
        assert.equal((await pool.query("SELECT * FROM order_notifications WHERE order_id = $1", [disabledOrder.id])).rowCount, 0);
        response = await fetch(`${base}/api/admin/orders/${disabledOrder.id}/notification`, { method: "POST", headers });
        assert.equal(response.status, 404);
    }
    response = await fetch(`${base}/api/orders/mine?before=invalid`, { headers: { Cookie: a.cookie } });
    assert.equal(response.status, 400);
    response = await fetch(`${base}/api/auth`, {
      method: "DELETE", headers: { Origin: base, Cookie: a.cookie },
    });
    assert.equal(response.status, 200);
    response = await fetch(`${base}/api/orders/mine`, { headers: { Cookie: a.cookie } });
    assert.equal(response.status, 401);
    const secondToken = secondDevice.split("=")[1];
    await pool.query("UPDATE customer_sessions SET expires_at = NOW() - INTERVAL '1 second' WHERE token_hash = $1", [
      createHash("sha256").update(secondToken).digest("hex"),
    ]);
    response = await fetch(`${base}/api/orders/mine`, { headers: { Cookie: secondDevice } });
    assert.equal(response.status, 401);
    for (let i = 0; i < 11; i++) {
      response = await postAuth({ mode: "signin", email: rateEmail, password: "Incorrect-password" });
    }
    assert.equal(response.status, 429);
  } finally {
    const ids = (await pool.query("SELECT id FROM customers WHERE email = ANY($1::text[])", [emails])).rows.map((u) => u.id);
    await pool.query("DELETE FROM orders WHERE customer_id = ANY($1::uuid[])", [ids]);
    await pool.query("DELETE FROM customers WHERE id = ANY($1::uuid[])", [ids]);
    await pool.query("DELETE FROM auth_attempts WHERE key_hash = ANY($1::text[])", [
      [...emails, rateEmail].map((email) => createHash("sha256").update(email).digest("hex")),
    ]);
    await pool.end();
  }
});
