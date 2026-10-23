import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";
import assert from "node:assert/strict";
import ts from "typescript";

const source = readFileSync(new URL("../lib/requestOrigin.ts", import.meta.url), "utf8");
const exports = {};
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports, URL });

test("same-origin checks use the actual Host behind the Next.js server", () => {
  const request = (origin, host = "127.0.0.1:3102") => new Request("http://localhost:3102/api/auth", {
    headers: { Host: host, ...(origin ? { Origin: origin } : {}) },
  });
  assert.equal(exports.isSameOrigin(request("http://127.0.0.1:3102")), true);
  assert.equal(exports.isSameOrigin(request("http://localhost:3102", "localhost:3102")), true);
  assert.equal(exports.isSameOrigin(request("http://other.invalid")), false);
  assert.equal(exports.isSameOrigin(request("https://127.0.0.1:3102")), false);
  assert.equal(exports.isSameOrigin(request(null)), false);
});
