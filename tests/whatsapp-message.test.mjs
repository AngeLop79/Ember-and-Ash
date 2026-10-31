import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/utils.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  encodeURIComponent,
  require: (name) => {
    if (name === "./data") return { RESTAURANT_INFO: { whatsapp: "+390000000000" } };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});

test("WhatsApp order text preserves separate customizations and totals without emoji", () => {
  const items = [
    { name: "Panino", price: 500, quantity: 1, accessories: [{ name: "Maionese" }] },
    { name: "Panino", price: 500, quantity: 1, accessories: [{ name: "Ketchup" }] },
  ];
  for (const type of ["pickup", "dine-in"]) {
    const encoded = exports.buildWhatsAppOrderMessage(items, 1000, type, "Mario");
    const text = decodeURIComponent(encoded);
    assert.doesNotMatch(text, /\p{Extended_Pictographic}|\uFFFD|\uFE0F/u);
    assert.equal(text.match(/- Panino x1/g).length, 2);
    assert.match(text, /Personalizzazioni gratuite: Maionese/);
    assert.match(text, /Personalizzazioni gratuite: Ketchup/);
    assert.ok(text.includes("*Totale: 10,00\u00a0€*"));
    assert.match(text, /Nome: Mario/);
    assert.ok(text.includes(type === "pickup" ? "*Ritiro in sede*" : "*Consumo al ristorante*"));
    const url = new URL(exports.getWhatsAppUrl(encoded));
    assert.equal(url.searchParams.get("text"), text);
  }
});

test("WhatsApp reservation text retains details without emoji", () => {
  const text = decodeURIComponent(exports.buildWhatsAppReservationMessage(
    "Mario", "2026-12-12", "12:00", 4, "Vicino alla finestra",
  ));
  assert.doesNotMatch(text, /\p{Extended_Pictographic}|\uFFFD|\uFE0F/u);
  assert.match(text, /Nome: Mario/);
  assert.match(text, /Data: 2026-12-12/);
  assert.match(text, /Ora: 12:00/);
  assert.match(text, /Ospiti: 4/);
  assert.match(text, /Richieste speciali: Vicino alla finestra/);
});
