import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../lib/whatsapp.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const configured = {
  WHATSAPP_ORDER_NOTIFICATIONS_ENABLED: "true",
  WHATSAPP_ACCESS_TOKEN: "test-only-token",
  WHATSAPP_PHONE_NUMBER_ID: "123456",
  WHATSAPP_API_VERSION: "v23.0",
  WHATSAPP_ORDER_TEMPLATE: "order_received",
  WHATSAPP_TEMPLATE_LANGUAGE: "it",
};

function setup(fetchImpl, env = configured) {
  const row = { status: "pending", recipient: "390000000000", parameters: ["Test", "EA-TEST", "2 x Piatto", "10,00 EUR", "Ritiro", "Non previsto", "Ricevuto"] };
  const order = {
    id: "EA-0123456789ABCDEF", publicCode: "A-042", customer: "Test",
    total: 1000, type: "pickup", address: null, status: "ready", paymentStatus: "paid",
    items: [{
      name: "Piatto", quantity: 2, unitPrice: 500, notes: "Poco sale",
      accessories: [{ id: "maionese", name: "Maionese", description: "" }],
    }],
  };
  let calls = 0;
  const logs = [];
  const errors = [];
  const db = {
    async query(sql, values) {
      if (sql.includes("CONFIG_MISSING")) {
        if (row.status === "pending") row.status = "not_configured";
        return { rows: [] };
      }
      if (sql.includes("RETURNING recipient")) {
        if (row.status !== "pending") return { rows: [] };
        row.status = "sending";
        return { rows: [{ ...row }] };
      }
      if (sql.includes("provider_message_id =")) {
        row.status = values[1];
        row.messageId = values[2];
        row.errorCode = values[3];
        return { rows: [] };
      }
      if (sql.startsWith("SELECT status")) return { rows: [{ status: row.status }] };
      throw new Error(`Unexpected query: ${sql}`);
    },
  };
  const exports = {};
  const loadLocal = (path) => {
    const code = ts.transpileModule(readFileSync(new URL(`../${path}.ts`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localExports = {};
    vm.runInNewContext(code, {
      exports: localExports,
      URL,
      require: (name) => {
        if (name === "@/lib/utils") return { formatPrice: (cents) => `${(cents / 100).toFixed(2)} EUR` };
        if (name === "@/lib/orderDisplay") return loadLocal("lib/orderDisplay");
        throw new Error(`Unexpected dependency ${name}`);
      },
    });
    return localExports;
  };
  const context = vm.createContext({
    exports,
    require: (name) => {
      if (name === "@/lib/db") return { getDb: () => db };
      if (name === "@/lib/orders") return { getOrderDetails: async () => order };
      if (name === "@/lib/whatsappTemplate") return loadLocal("lib/whatsappTemplate");
      if (name === "@/lib/features") return {
        whatsappOrderNotificationsEnabled: () => env.WHATSAPP_ORDER_NOTIFICATIONS_ENABLED === "true",
      };
      return require(name);
    },
    process: { env },
    AbortSignal,
    console: {
      warn() {},
      info(message) { logs.push(JSON.parse(message)); },
      error(...args) { errors.push(args); },
    },
    fetch: async (...args) => { calls++; return fetchImpl(...args); },
  });
  vm.runInContext(compiled, context);
  return { send: exports.sendOrderNotification, row, order, logs, errors, calls: () => calls };
}

test("missing configuration is explicit and does not contact Meta", async () => {
  const fixture = setup(() => { throw new Error("Must not send"); }, { WHATSAPP_ORDER_NOTIFICATIONS_ENABLED: "true" });
  assert.equal(await fixture.send("EA-TEST"), "not_configured");
  assert.equal(fixture.calls(), 0);
});

test("disabled or absent feature flag prevents all sending and state changes", async () => {
  for (const flag of [undefined, "false"]) {
    const fixture = setup(() => { throw new Error("Must not send"); }, {
      ...configured, WHATSAPP_ORDER_NOTIFICATIONS_ENABLED: flag,
    });
    assert.equal(await fixture.send("EA-TEST"), null);
    assert.equal(fixture.row.status, "pending");
    assert.equal(fixture.calls(), 0);
  }
});
test("approved positional template is sent once, including all seven fields", async () => {
  const fixture = setup(async (url, options) => {
    assert.equal(url, "https://graph.facebook.com/v23.0/123456/messages");
    assert.equal(options.headers.Authorization, "Bearer test-only-token");
    const payload = JSON.parse(options.body);
    assert.equal(payload.to, "390000000000");
    assert.equal(payload.type, "template");
    assert.equal(payload.template.name, "order_received");
    assert.equal(payload.template.language.code, "it");
    assert.deepEqual(payload.template.components[0].parameters.map((p) => p.text), fixture.row.parameters);
    return Response.json({ messages: [{ id: "wamid.test" }] });
  });
  await Promise.all([fixture.send("EA-TEST"), fixture.send("EA-TEST")]);
  assert.equal(await fixture.send("EA-TEST"), "accepted");
  assert.equal(fixture.row.messageId, "wamid.test");
  assert.equal(fixture.calls(), 1);
});

for (const [http, status] of [[400, "failed"], [500, "unknown"]]) {
  test(`provider HTTP ${http} is persisted as ${status}, not success`, async () => {
    const fixture = setup(async () => Response.json({ error: { code: 123 } }, { status: http }));
    assert.equal(await fixture.send("EA-TEST"), status);
    assert.equal(fixture.row.errorCode, "123");
    await fixture.send("EA-TEST");
    assert.equal(fixture.calls(), 1);
  });
}

test("timeout and malformed responses cannot trigger duplicate sends", async () => {
  for (const action of [
    async () => { throw new DOMException("Timed out", "TimeoutError"); },
    async () => new Response("<html>Error</html>", { status: 502 }),
    async () => Response.json({}),
  ]) {
    const fixture = setup(action);
    assert.equal(await fixture.send("EA-TEST"), "unknown");
    await fixture.send("EA-TEST");
    assert.equal(fixture.calls(), 1);
  }
});

test("invalid API configuration is not used to construct a request", async () => {
  const fixture = setup(() => { throw new Error("Must not send"); }, { ...configured, WHATSAPP_API_VERSION: "../invalid" });
  assert.equal(await fixture.send("EA-TEST"), "failed");
  assert.equal(fixture.row.errorCode, "CONFIG_INVALID");
  assert.equal(fixture.calls(), 0);
});

test("logs the exact request payload and complete successful response without authorization", async () => {
  let sentPayload;
  const body = JSON.stringify({
    messaging_product: "whatsapp",
    contacts: [{ input: "390000000000", wa_id: "390000000000" }],
    messages: [{ id: "wamid.logged", message_status: "accepted" }],
  });
  const fixture = setup(async (_url, options) => {
    sentPayload = JSON.parse(options.body);
    return new Response(body, {
      status: 200,
      headers: { "content-type": "application/json", "x-fb-trace-id": "trace-test" },
    });
  });
  assert.equal(await fixture.send("EA-TEST"), "accepted");
  assert.equal(fixture.logs.length, 2);
  const [request, response] = fixture.logs;
  assert.equal(request.event, "whatsapp.request");
  assert.equal(request.orderId, "EA-TEST");
  assert.equal(request.method, "POST");
  assert.equal(request.url, "https://graph.facebook.com/v23.0/123456/messages");
  assert.deepEqual(request.payload, sentPayload);
  assert.equal(response.event, "whatsapp.response");
  assert.equal(response.orderId, request.orderId);
  assert.equal(response.httpStatus, 200);
  assert.equal(response.traceId, "trace-test");
  assert.equal(response.body, body);
  assert.ok(response.durationMs >= 0);
  assert.ok(!JSON.stringify(fixture.logs).includes(configured.WHATSAPP_ACCESS_TOKEN));
  assert.ok(!JSON.stringify(fixture.logs).includes("Authorization"));
  await fixture.send("EA-TEST");
  assert.equal(fixture.logs.length, 2);
});

test("logs full Meta errors and non-JSON bodies before parsing", async () => {
  for (const body of [
    JSON.stringify({ error: { code: 132000, message: "Parameter mismatch", error_data: { details: "Expected 2 parameters" }, fbtrace_id: "trace-error" } }),
    "<html>Bad gateway</html>",
  ]) {
    const fixture = setup(async () => new Response(body, { status: 400 }));
    assert.equal(await fixture.send("EA-TEST"), body.startsWith("{") ? "failed" : "unknown");
    assert.equal(fixture.logs[1].httpStatus, 400);
    assert.equal(fixture.logs[1].body, body);
  }
});

test("network errors are diagnostic and never log the access token", async () => {
  const fixture = setup(async () => { throw new Error(`Network failure ${configured.WHATSAPP_ACCESS_TOKEN}`); });
  assert.equal(await fixture.send("EA-TEST"), "unknown");
  assert.equal(fixture.logs.length, 1);
  assert.match(fixture.errors[0][1].errorMessage, /Network failure \[REDACTED\]/);
  assert.ok(!JSON.stringify([fixture.logs, fixture.errors]).includes(configured.WHATSAPP_ACCESS_TOKEN));
});

test("redacts the access token if Meta echoes it in the response body", async () => {
  const fixture = setup(async () => Response.json({
    error: { code: 190, message: `Invalid token ${configured.WHATSAPP_ACCESS_TOKEN}` },
  }, { status: 400 }));
  assert.equal(await fixture.send("EA-TEST"), "failed");
  assert.match(fixture.logs[1].body, /\[REDACTED\]/);
  assert.ok(!JSON.stringify(fixture.logs).includes(configured.WHATSAPP_ACCESS_TOKEN));
});

for (const format of ["named", "positional"]) {
  test(`v2 sends current order data and exactly one protected URL button (${format})`, async () => {
    const fixture = setup(async (url, options) => {
      const payload = JSON.parse(options.body);
      const components = payload.template.components;
      assert.equal(components.length, 2);
      assert.equal(components[0].parameters.length, 7);
      assert.equal(components[0].parameters[1].text, "A-042");
      assert.match(components[0].parameters[6].text, /Pronto; pagato/);
      assert.match(components[0].parameters[2].text, /2 x Piatto.*Poco sale/);
      assert.match(components[0].parameters[2].text, /Maionese/);
      assert.equal(components[0].parameters[1].parameter_name, format === "named" ? "order_code" : undefined);
      assert.deepEqual(components[1], {
        type: "button", sub_type: "url", index: "0",
        parameters: [{
          type: "text", text: "EA-0123456789ABCDEF",
          ...(format === "named" ? { parameter_name: "order_id" } : {}),
        }],
      });
      return Response.json({ messages: [{ id: "wamid.v2" }] });
    }, {
      ...configured, WHATSAPP_ORDER_TEMPLATE_VERSION: "2",
      WHATSAPP_TEMPLATE_PARAMETER_FORMAT: format, APP_BASE_URL: "https://orders.example.com",
    });
    assert.equal(await fixture.send("EA-0123456789ABCDEF"), "accepted");
    assert.equal(fixture.calls(), 1);
  });
}

for (const format of ["named", "positional"]) {
  test(`v3 sends only the sagra body fields and a dynamic protected URL (${format})`, async () => {
    const fixture = setup(async (_url, options) => {
      const { components } = JSON.parse(options.body).template;
      assert.deepEqual(components, [
        {
          type: "body",
          parameters: [
            { type: "text", text: "Test", ...(format === "named" ? { parameter_name: "customer_name" } : {}) },
            { type: "text", text: "A-042", ...(format === "named" ? { parameter_name: "order_id" } : {}) },
          ],
        },
        {
          type: "button", sub_type: "url", index: "0",
          parameters: [{ type: "text", text: "EA-0123456789ABCDEF" }],
        },
      ]);
      return Response.json({ messages: [{ id: "wamid.v3" }] });
    }, {
      ...configured, WHATSAPP_ORDER_TEMPLATE_VERSION: "3",
      WHATSAPP_TEMPLATE_PARAMETER_FORMAT: format,
      APP_BASE_URL: "https://ember-and-ash-three.vercel.app",
    });
    fixture.row.parameters = ["obsolete", "old-order"];
    assert.equal(await fixture.send(fixture.order.id), "accepted");
    await fixture.send(fixture.order.id);
    assert.equal(fixture.calls(), 1);
  });
}

for (const version of ["2", "3"]) {
test(`v${version} rejects non-public HTTPS origins without sending`, async () => {
  for (const base of [undefined, "http://example.com", "https://localhost", "https://127.0.0.1",
    "https://example.com/orders", "https://user:secret@example.com", "https://example.com?x=1", "https://host.local"]) {
    const fixture = setup(() => { throw new Error("Must not send"); }, {
      ...configured, WHATSAPP_ORDER_TEMPLATE_VERSION: version, APP_BASE_URL: base,
    });
    assert.equal(await fixture.send("EA-TEST"), "failed");
    assert.equal(fixture.row.errorCode, "CONFIG_INVALID");
    assert.equal(fixture.calls(), 0);
    }
  });
}

    test("unsupported template versions or parameter formats fail without sending", async () => {
      for (const invalid of [
        { WHATSAPP_ORDER_TEMPLATE_VERSION: "4" },
        { WHATSAPP_ORDER_TEMPLATE_VERSION: "3", WHATSAPP_TEMPLATE_PARAMETER_FORMAT: "invalid" },
      ]) {
        const fixture = setup(() => { throw new Error("Must not send"); }, {
          ...configured, APP_BASE_URL: "https://ember-and-ash-three.vercel.app", ...invalid,
        });
        assert.equal(await fixture.send("EA-TEST"), "failed");
        assert.equal(fixture.row.errorCode, "CONFIG_INVALID");
        assert.equal(fixture.calls(), 0);
      }
    });

    test("sagra template matches the two named fields and dynamic URL", () => {
      const template = JSON.parse(readFileSync(new URL("../whatsapp/conferma_ordine_sagra_v3.json", import.meta.url), "utf8"));
      assert.equal(template.parameter_format, "NAMED");
      assert.equal(template.category, "UTILITY");
      const names = [...template.components[0].text.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]);
      assert.deepEqual(names, ["customer_name", "order_id"]);
      assert.deepEqual(template.components[0].example.body_text_named_params.map((p) => p.param_name), names);
      const [button] = template.components[1].buttons;
      assert.equal(button.url, "https://ember-and-ash-three.vercel.app/orders/{{1}}");
      assert.equal(button.example[0], "https://ember-and-ash-three.vercel.app/orders/EA-0123456789ABCDEF");
    });

test("provided Meta template matches the named body parameters and order button", () => {
  const template = JSON.parse(readFileSync(new URL("../whatsapp/riepilogo_ordine_v2.json", import.meta.url), "utf8"));
  assert.equal(template.parameter_format, "NAMED");
  assert.equal(template.category, "UTILITY");
  const names = [...template.components[0].text.matchAll(/\{\{([a-z_]+)\}\}/g)].map((m) => m[1]);
  assert.deepEqual(names, ["customer_name", "order_code", "items", "total", "order_type", "address", "status"]);
  assert.deepEqual(template.components[0].example.body_text_named_params.map((p) => p.param_name), names);
  const [button] = template.components[1].buttons;
  assert.equal(button.type, "URL");
  assert.equal(button.text, "Visualizza ordine");
  assert.equal(button.url, "https://your-project.vercel.app/orders/{{order_id}}");
  assert.match(button.example[0], /^EA-[A-F0-9]{16}$/);
});
