# Proxy Passthrough: Upstream Key Handling & No-Custody Model

> **One-line summary:** InferShield acts as a transparent security layer between your application and upstream LLM providers. Your upstream API keys **stay in your environment** — InferShield never stores, logs, or transmits them.

---

## How It Works

```
Your App / Extension / curl
        │
        │  (request + your upstream key)
        ▼
┌─────────────────────┐
│   InferShield Proxy │  ← inspects, redacts, or blocks the payload
└─────────────────────┘
        │
        │  (original request forwarded to upstream)
        ▼
Upstream Provider (OpenAI, Anthropic, Google, Cohere…)
```

InferShield is a **passthrough proxy**: it reads the request body to run security checks, then forwards the request to the upstream API using the key configured in the proxy's environment. InferShield does not pool credentials or act as an authentication broker.

> **Implementation note:** In the current proxy (`proxy/server.js`), the upstream API key is read from the proxy's own environment (`OPENAI_API_KEY` env var). The `Authorization` header sent by the client is validated for **presence** only — it is not forwarded to the upstream provider verbatim. This means the proxy uses a single shared key per upstream provider. Per-client key forwarding requires a code-level change (see [Advanced: Per-Client Key Forwarding](#advanced-per-client-key-forwarding)).

---

## Supplying Your Upstream API Key

### Mode 1: Docker (recommended for production)

Set your upstream key as an environment variable before starting containers — it is passed to the proxy container at launch and never baked into the image:

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

docker compose up -d
```

Or with `docker run`:

```bash
docker run -d \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -p 8000:8000 \
  infershield/proxy
```

### Mode 2: Local Proxy (npm)

```bash
# Set your upstream key in the shell before starting the proxy
cd proxy
cp .env.example .env
# Edit .env and add: OPENAI_API_KEY=sk-...

npm start
```

The proxy process reads the key from `.env` at startup. It is used for outgoing requests only and is never logged or transmitted to InferShield infrastructure.

### Mode 3: Browser Extension

The extension operates client-side and does **not** route through the proxy server. Your upstream key is held exclusively in your browser session (managed by ChatGPT, Claude.ai, or the provider's web UI). InferShield's extension intercepts the request in-browser before submission and flags or redacts sensitive content — no key extraction occurs.

For API-level extension integrations (e.g., custom sidebars calling OpenAI directly):

```javascript
// Your key stays in the extension's local storage or environment
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'http://localhost:8000/v1'  // Route through InferShield proxy
});
```

---

## What InferShield Does (and Does Not Do) With Your Key

| InferShield DOES | InferShield does NOT |
|---|---|
| ✅ Reads request body (prompt text) to scan for threats | ❌ Store your upstream API key |
| ✅ Redacts detected PII/secrets from the prompt before forwarding | ❌ Log the raw `Authorization` header |
| ✅ Block or allow requests based on policy | ❌ Share, pool, or transmit your key to any third party |
| ✅ Uses the upstream key (from proxy env) to call the provider | ❌ Modify response content |
| ✅ Returns the upstream provider's response verbatim | ❌ Retain prompt content beyond the truncated audit log entry |

**What gets logged locally (audit log):**
- Truncated prompt text (first 500 characters)
- Risk score and threat labels
- Agent ID and timestamp
- Status (blocked / allowed)

**What is never logged:**
- `Authorization` / `x-api-key` header values
- Full prompt text beyond 500 characters
- Response content beyond 500 characters

---

## Deployment Modes At a Glance

| Mode | Key Location | Proxy Involved | Scope |
|---|---|---|---|
| Local npm proxy | `proxy/.env` on your machine | Yes (localhost:8000) | Single user/dev |
| Docker Compose | Env var passed to container | Yes (container port) | Team / self-hosted |
| Browser Extension | Browser session / extension storage | No (in-browser only) | Single user, web UIs |

---

## Troubleshooting

### 401 Unauthorized from Upstream Provider

**Symptom:** You receive a 401 response with `"error.type": "invalid_request_error"` or `"code": "invalid_api_key"` — this originates from OpenAI or Anthropic, not from InferShield.

**Causes & fixes:**

| Cause | Fix |
|---|---|
| `OPENAI_API_KEY` not set in proxy environment | `export OPENAI_API_KEY=sk-...` then restart proxy |
| Key set but expired or revoked | Rotate the key in your provider's dashboard |
| Wrong env var name for provider | See the reference table below |
| Docker container started without the `-e` flag | Add env vars to `docker run` or `docker-compose.yml`, then `docker compose restart proxy` |
| `.env` file changed but proxy not restarted | Restart with `Ctrl+C && npm start` or `docker compose restart proxy` |

**Verify the key is valid (bypasses proxy):**
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | jq '.error // "OK"'
```

**Verify the proxy container has the key:**
```bash
docker compose exec proxy env | grep OPENAI_API_KEY
```

**Env var reference by provider:**

| Provider | Env var | Used in header |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `Authorization: Bearer <key>` |
| Anthropic | `ANTHROPIC_API_KEY` | `x-api-key: <key>` |
| Google (Gemini) | `GOOGLE_API_KEY` | `x-goog-api-key: <key>` |
| Cohere | `COHERE_API_KEY` | `Authorization: Bearer <key>` |

---

### 403 Forbidden — Request Blocked by InferShield

**Symptom:** `{"error": {"type": "firewall_block", "message": "Request blocked by InferShield: ..."}}`

This is **not** an upstream error — InferShield's detection layer blocked the request before it reached the provider.

**Fix:**
- Check the `threats` array in the response body for the specific pattern that triggered the block
- Review your prompt for PII, prompt injection keywords, or hardcoded secrets
- If it's a false positive, raise the risk threshold in `backend/.env`:
  ```bash
  RISK_THRESHOLD=80   # Default. Increase to reduce false positives (max 100)
  # Then restart the backend
  ```

---

### 401 Unauthorized from Proxy (Missing Authorization Header)

**Symptom:** `{"error": "Missing Authorization header"}`

The proxy requires an `Authorization: Bearer <token>` header from the client, even though the upstream API key comes from the proxy's own env. This prevents unauthenticated open relay abuse.

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

The value of the token is validated for presence only; it is not forwarded upstream.

---

### Missing Env Var — Proxy Returns 502 or "upstream key not configured"

**Symptom:** The proxy returns `502 Bad Gateway` or an error message about a missing upstream key.

```bash
# Check which env vars are set in the current shell
env | grep -E "OPENAI|ANTHROPIC|GOOGLE|COHERE"

# Set the missing one
export OPENAI_API_KEY=sk-...

# Restart the proxy (local)
Ctrl+C && npm start

# Restart the proxy (Docker)
docker compose restart proxy
```

---

### "Firewall unavailable" / Backend Unreachable

**Symptom:** All requests return `{"status": "blocked", "threats": ["Firewall unavailable"]}` or `risk_score: 100`.

The proxy **fails closed** by design — if the InferShield detection backend is unreachable, requests are blocked rather than passed through silently.

```bash
# Check backend health
curl http://localhost:5000/health

# Start backend if down (local)
cd backend && npm start

# Docker
docker compose ps
docker compose restart backend
```

Also verify `FIREWALL_ENDPOINT` in `proxy/.env` matches the actual backend address.

---

### Extension Mode: Requests Blocked Before Reaching the Proxy

The browser extension performs an in-browser scan. If a request is blocked at this stage:
- Open the InferShield extension popup → **Logs** tab to see the detection reason
- Adjust policy sensitivity in **Settings → Detection Threshold**
- Confirm the extension has `host_permissions` for `http://localhost/*` (required in Manifest V3)
- Check the browser console (F12) for CORS errors if routing through a local proxy
- If the block is a false positive, report it via [GitHub Issues](https://github.com/InferShield/infershield/issues)

---

### Extension Not Routing Through Proxy

If you've configured the extension to route through the local proxy but requests are hitting the upstream directly:

1. Confirm the proxy is running: `curl http://localhost:8000/health`
2. Check the extension **Proxy URL** setting — must match exactly (e.g., `http://localhost:8000`), no trailing slash
3. Reload the extension after changing settings
4. Check browser console for `net::ERR_CONNECTION_REFUSED` — proxy may not be running

---

## Advanced: Per-Client Key Forwarding

The default proxy uses a single shared key from its own env. If you want each client to supply their own key and have it forwarded to the upstream provider:

In `proxy/server.js`, replace the hardcoded `OPENAI_API_KEY` usage:

```javascript
// Current (default): uses proxy's own env key
headers: {
  'Authorization': `Bearer ${OPENAI_API_KEY}`,
```

with:

```javascript
// Per-client forwarding: pass through the client's Authorization header
headers: {
  'Authorization': authHeader,
```

> ⚠️ Only enable this if your proxy is not publicly accessible. Any client with network access to the proxy would be able to use arbitrary upstream keys through it.

---

## Security Model Summary

```
Your API key flow (default mode):
  env var (proxy/.env or Docker -e flag)
        → proxy process memory at startup
          → used in outgoing Authorization header to upstream provider

At no point does InferShield:
  • Persist the key to disk (beyond your .env file)
  • Log the Authorization header value
  • Send the key anywhere other than the upstream provider
```

This is the **no-custody** model: InferShield provides security inspection without holding your credentials on any shared infrastructure.

---

## Related Docs

- [QUICKSTART.md](./QUICKSTART.md) — Full setup guide
- [THREAT_MODEL.md](./THREAT_MODEL.md) — What InferShield protects against
- [PII_REDACTION.md](./PII_REDACTION.md) — How redaction works
- [MANUAL_INTEGRATION.md](./MANUAL_INTEGRATION.md) — SDK/API integration patterns
