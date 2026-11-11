# Puskar AI

A responsive email-writing, reply-drafting and chat interface with a **separate server-side AI integration**. The interface runs in a browser; real AI generation requires a running Node server and your own authorized provider credentials.

## Features
- Email outreach composer with tone and audience inputs.
- Draft replies to provided messages.
- Chat interface, text-to-speech and optional browser speech recognition.
- Responsive light/dark interface.
- Same-origin AI requests through a Node.js server, **never from client-side credentials**.
- No third-party server runtime dependencies; API interactions run on the server.

## Run locally

1. Install Node.js 22 or newer.
2. Configure `OPENAI_API_KEY` in the **server environment**, not in the repository or JavaScript bundle. Set `OPENAI_MODEL` to a model available to your API account.
3. Run `npm start` and visit `http://127.0.0.1:3000`.
4. Run `npm test` to check the local HTTP server and front-end file delivery.

On macOS/Linux, for example, use `export OPENAI_API_KEY="..."` in your shell. On Windows, set an environment variable in your terminal or service settings; do not paste credentials into a shared screenshot or commit. Use a production hosting platform that supports a persistent Node.js server; set `HOST=0.0.0.0`, `PORT`, and `ALLOWED_ORIGIN` according to your deployment.

**GitHub Pages is a static preview only**: it can render the interface but cannot run `server.mjs`. Email generation and live chat there will show an unavailable-service message until backed by a securely hosted API.

## Security and limitations

- A credential was previously committed in a browser JavaScript file. The current version removes it, but **Git history may still expose it**. The project owner must **revoke/rotate the old key immediately** in the provider dashboard and review usage and billing. Removing the file content does not revoke the credential.
- All client requests are sent to a same-origin `/api/chat` route. The server validates request shape, limits body sizes, rejects cross-origin requests, applies a basic per-IP rate limit, and returns provider errors without exposing the key.
- The per-IP limiter is in memory. Public production use requires authentication, persistent/shared rate limits, quota limits, spending caps, CSRF safeguards as appropriate and managed deployment. This demo is **not** a hardened multi-tenant SaaS service.
- The dashboard's historical-looking counts and contacts are **illustrative placeholders**; the project has no real analytics or email delivery integration.
- The application drafts text. It does not send email or claim independent fact verification.

## Structure

`index.html`, `style.css`, `scrpit.js`: frontend. The existing `scrpit.js` filename is intentionally retained so existing links work.

`server.mjs`: minimal Node HTTP server and AI proxy.

`server.test.mjs`: integration tests.

`.env.example`: examples only. Do not commit actual secret values.
