import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";

const files = new Map([
  ["/", ["index.html", "text/html; charset=utf-8"]],
  ["/index.html", ["index.html", "text/html; charset=utf-8"]],
  ["/style.css", ["style.css", "text/css; charset=utf-8"]],
  ["/scrpit.js", ["scrpit.js", "text/javascript; charset=utf-8"]]
]);

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(data));
}

async function readJson(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) {
      const error = new Error("Request too large"); error.status = 413; throw error;
    }
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
  catch { const error = new Error("Malformed JSON"); error.status = 400; throw error; }
}

export function validatePayload(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;
  if (!Array.isArray(body.messages) || !body.messages.length || body.messages.length > 32) return false;
  if (body.jsonMode !== undefined && typeof body.jsonMode !== "boolean") return false;
  return body.messages.every(m =>
    m && typeof m === "object" &&
    ["system", "user", "assistant"].includes(m.role) &&
    typeof m.content === "string" && m.content.length > 0 && m.content.length <= 4000
  );
}

export function createServer(options = {}) {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY ?? "";
  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const origin = options.allowedOrigin ?? process.env.ALLOWED_ORIGIN ?? "";
  const rate = new Map();
  return createHttpServer(async (req, res) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, ai_configured: Boolean(apiKey) });
    if (req.method === "GET" && files.has(url.pathname)) {
      const [name, type] = files.get(url.pathname);
      try {
        const data = await readFile(new URL("./" + name, import.meta.url));
        res.writeHead(200, { "Content-Type": type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
        return res.end(data);
      } catch { return json(res, 500, { error: "Static asset unavailable" }); }
    }
    if (url.pathname !== "/api/chat" || req.method !== "POST") return json(res, 404, { error: "Not found" });
    const incomingOrigin = req.headers.origin;
    const expectedOrigin = origin || ("http://" + req.headers.host);
    if (incomingOrigin && incomingOrigin !== expectedOrigin && incomingOrigin !== ("https://" + req.headers.host)) {
      return json(res, 403, { error: "Origin not allowed" });
    }
    if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) return json(res, 415, { error: "JSON required" });
    const ip = req.socket.remoteAddress || "local";
    const now = Date.now();
    const old = (rate.get(ip) || []).filter(t => now - t < 60000);
    if (old.length >= 10) return json(res, 429, { error: "Too many requests. Try again later." });
    old.push(now); rate.set(ip, old);
    if (rate.size > 5000) for (const [k, timestamps] of rate) if (!timestamps.some(t => now - t < 60000)) rate.delete(k);
    if (!apiKey) return json(res, 503, { error: "AI server not configured. Set the server environment variable and restart." });
    try {
      const body = await readJson(req);
      if (!validatePayload(body)) return json(res, 400, { error: "Invalid chat request" });
      const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: body.messages, max_completion_tokens: 1000, ...(body.jsonMode ? { response_format: { type: "json_object" } } : {}) }),
        signal: AbortSignal.timeout(25000)
      });
      if (!upstream.ok) return json(res, 502, { error: "AI provider request failed. Check server credentials, model access, and provider availability." });
      const output = await upstream.json();
      const reply = output?.choices?.[0]?.message?.content;
      if (typeof reply !== "string") return json(res, 502, { error: "AI provider returned an invalid response" });
      return json(res, 200, { reply });
    } catch (error) {
      if (error.status) return json(res, error.status, { error: error.message });
      return json(res, 502, { error: "AI provider temporarily unavailable" });
    }
  });
}

if (process.argv[1] && import.meta.url === new URL("file://" + process.argv[1]).href) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || "127.0.0.1";
  createServer().listen(port, host, () => {
    console.log("Puskar AI server listening on http://" + host + ":" + port);
  });
}
