import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer, validatePayload } from "./server.mjs";

test("validates chat messages before sending upstream", () => {
  assert.equal(validatePayload({messages:[{role:"user",content:"Hello"}]}), true);
  for (const input of [null, {}, { messages: [] }, { messages: [{role:"invalid", content:"Hi"}] }, { messages: [{role:"user", content: ""}] }])
    assert.equal(validatePayload(input), false);
});

test("static UI, health check, origin policy, and missing-key responses", async () => {
  const server = createServer({ apiKey: "" });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = "http://127.0.0.1:" + server.address().port;
  try {
    let r = await fetch(address + "/health"); assert.equal(r.status, 200);
    assert.equal((await r.json()).ai_configured, false);
    r = await fetch(address); assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes('src="scrpit.js"'));
    assert.equal((html.match(/<html/g)||[]).length, 1);
    r = await fetch(address + "/scrpit.js"); assert.equal(r.status, 200);
    const js = await r.text(); assert.equal(js.includes("sk-proj-"), false);
    r = await fetch(address + "/.env"); assert.equal(r.status, 404);
    r = await fetch(address + "/api/chat", { method: "POST", headers: { "content-type": "application/json", "origin": "https://example.invalid" }, body: "{}" }); assert.equal(r.status, 403);
    r = await fetch(address + "/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }); assert.equal(r.status, 503);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
