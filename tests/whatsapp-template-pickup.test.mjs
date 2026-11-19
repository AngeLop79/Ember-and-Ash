import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../lib/whatsappTemplate.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (name) => {
    if (name === "@/lib/orderDisplay") {
      return {
        ORDER_TYPES: { pickup: "Ritiro in sede", delivery: "Consegna", "dine-in": "Ristorante" },
        orderStatusLabel: () => "In attesa di conferma",
      };
    }
    if (name === "@/lib/utils") return { formatPrice: (amount) => `${amount}` };
    throw new Error(`Unexpected dependency: ${name}`);
  },
});

test("WhatsApp template orders include pickup time without the former location label", () => {
  const parameters = exports.orderTemplateParameters({
    customer: "Mario Rossi",
    publicCode: "A-042",
    items: [],
    total: 500,
    type: "pickup",
    pickupTime: "19:30",
    status: "pending",
    paymentStatus: "pending",
  });

  assert.equal(parameters[4], "Orario di ritiro: 19:30");
  assert.doesNotMatch(parameters[4], /Ritiro in sede/);
});
