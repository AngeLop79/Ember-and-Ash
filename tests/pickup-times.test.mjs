import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const config = JSON.parse(
  readFileSync(new URL("../config/pickup-times.json", import.meta.url), "utf8"),
);
const source = readFileSync(new URL("../lib/pickupTimes.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    esModuleInterop: true,
  },
}).outputText;
const exports = {};
vm.runInNewContext(compiled, {
  exports,
  require: (name) => {
    if (name === "@/config/pickup-times.json") return config;
    throw new Error(`Unexpected dependency: ${name}`);
  },
});

test("pickup times accept only configured slots", () => {
  assert.deepEqual(Array.from(exports.PICKUP_TIMES), [
    "19:30",
    "20:00",
    "20:30",
    "21:00",
    "21:30",
    "22:00",
    "22:30",
    "23:00",
    "23:30",
  ]);
  assert.equal(exports.isPickupTime("19:30"), true);
  assert.equal(exports.isPickupTime("23:30"), true);
  assert.equal(exports.isPickupTime("19:45"), false);
  assert.equal(exports.isPickupTime(""), false);
});
