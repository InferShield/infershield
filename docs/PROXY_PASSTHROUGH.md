# Proxy Passthrough: Upstream Key Handling & No-Custody Model

> **One-line summary:** InferShield acts as a transparent security layer between your application and upstream LLM providers. Your upstream API keys **stay in your environment** — InferShield never stores, logs, or transmits them.

---

## How It Works

```
Your App / Extension / curl
        │
        │  (request + your upstream key in header)
        ▼
┌─────────────────────┐
│   InferShield Proxy │  ← inspects, redacts, or blocks the payload
└─────────────────────┘
        │
        │  (original request forwarded unchanged)
        ▼
Upstream Provider (OpenAI, Anthropic, Google, Cohere…)
```

InferShield is a **passthrough proxy**: it reads the request body to run security checks, then forwards the full request (including your `Authorization` header) directly to the upstream API. InferShield does not substitute its own credentials, pool your keys, or proxy authentication on your behalf.

---

## Supplying Your Upstream API Key

### Mode 1: Docker (recommended for production)

Set your upstream key as an environment variable in the container — it passes straight through in the `Authorization` header:

```bash
docker run -d \
  -e OPENAI_API_KEY=sk-... \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  -p 8888:8888 \
  infershield/infershield
```

Then point your client at the proxy:

```bash
export OPENAI_BASE_URL=http://localhost:8888/openai
```

The proxy reads `OPENAI_API_KEY` from the environment and forwards it to `api.openai.com`. It is **never written to disk, logged, or transmitted anywhere else**.

### Mode 2: Local (Node.js)

```bash
# Set your upstream key in the shell before starting the proxy
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

cd backend
node proxy/server.js
```

The proxy process inherits these env vars. They are forwarded in outgoing requests only.

### Mode 3: Browser Extension

The extension operates client-side and does **not** route through the proxy server. Your upstream key is held exclusively in your browser session (managed by ChatGPT, Claude.ai, or the provider's web UI). InferShield's extension intercepts the request in-browser before submission and flags or redacts sensitive content — no key extraction occurs.

For API-level extension integrations (e.g., custom sidebars calling OpenAI directly):

```javascript
// Your key stays in the extension's local storage or environment
const response = await fetch("http://localhost:8888/openai/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${OPENAI_API_KEY}`,  // forwarded as-is
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ model: "gpt-4o", messages: [...] })
});
```

---

## What InferShield Sees, Does, and Does NOT Do

| What InferShield does | What InferShield does NOT do |
|---|---|
| ✅ Reads request body (prompt text) to scan for threats | ❌ Store your upstream API key |
| ✅ Redacts detected PII/secrets from the prompt before forwarding | ❌ Log the raw `Authorization` header |
| ✅ Blocks requests that violate your configured policies | ❌ Proxy authentication or manage OAuth tokens |
| ✅ Logs threat metadata (risk score, detection type, timestamp) | ❌ Persist raw prompts beyond the in-memory scan window |
| ✅ Forwards the upstream key in the `Authorization` header | ❌ Share, pool, or transmit your key to any third party |
| ✅ Returns the upstream provider's response verbatim | ❌ Modify response content |

### What gets logged

InferShield's audit log records:
- Timestamp, risk score, detection type (e.g., `PII_EMAIL`, `PROMPT_INJECTION`)
- Request method + path (e.g., `POST /v1/chat/completions`)
- Whether the request was blocked or allowed

It does **not** log:
- Raw prompt content (only redacted snippets when configured)
- `Authorization` / `x-api-key` header values
- IP addresses (unless explicitly enabled via `AUDIT_LOG_IP=true`)

---

## Quick-Start: Route One Request Through the Proxy

```bash
# 1. Start the proxy (local mode)
export OPENAI_API_KEY=sk-...
cd backend && node proxy/server.js

# 2. In another terminal, send a request via curl
curl http://localhost:8888/openai/v1/chat/completions \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello, world!"}]
  }'

# Expected: normal OpenAI response, no keys stored by InferShield
```

---

## Troubleshooting

### 401 / 403 from upstream provider

**Symptom:** You receive a 401 or 403 response that originates from OpenAI, Anthropic, etc. (check `"error.type"` in the response body).

**Causes & fixes:**

| Cause | Fix |
|---|---|
| `OPENAI_API_KEY` not set in environment | `export OPENAI_API_KEY=sk-...` before starting the proxy |
| Key set but expired or revoked | Rotate the key in your provider's dashboard |
| Wrong env var name for provider | See the table below for correct variable names |
| Docker container started without `-e` flag | Add env vars to `docker run` or `docker-compose.yml` |

**Env var reference by provider:**

| Provider | Env var | Header forwarded |
|---|---|---|
| OpenAI | `OPENAI_API_KEY` | `Authorization: Bearer <key>` |
| Anthropic | `ANTHROPIC_API_KEY` | `x-api-key: <key>` |
| Google (Gemini) | `GOOGLE_API_KEY` | `x-goog-api-key: <key>` |
| Cohere | `COHERE_API_KEY` | `Authorization: Bearer <key>` |

### Missing env var — proxy returns 502

**Symptom:** The proxy returns `502 Bad Gateway` with message `"upstream key not configured"`.

**Fix:**
```bash
# Check which env vars are set
env | grep -E "OPENAI|ANTHROPIC|GOOGLE|COHERE"

# Set the missing one
export OPENAI_API_KEY=sk-...

# Restart the proxy
```

### Header forwarding not working (custom proxy client)

If you're building a custom client and the upstream key isn't reaching the provider, verify:

1. Your client sends `Authorization` (or the provider-specific header) to the InferShield proxy — not a different endpoint.
2. The proxy config (`backend/proxy/config.js`) includes the correct upstream host for your provider.
3. TLS certificate is trusted — see [QUICKSTART.md](./QUICKSTART.md) for root CA installation.

### Extension mode: requests blocked before reaching the proxy

The browser extension performs an in-browser scan. If a request is blocked at this stage:
- Open the InferShield extension popup → **Logs** tab to see the detection reason.
- Adjust policy sensitivity in **Settings → Detection Threshold**.
- If the block is a false positive, report it via [GitHub Issues](https://github.com/InferShield/infershield/issues).

---

## Security Model Summary

```
Your API key flow:
  env var / browser session
        → your app code
          → Authorization header in HTTP request
            → InferShield proxy (inspects body, forwards header as-is)
              → upstream provider

At no point does InferShield:
  • Persist the key to disk
  • Log the Authorization header
  • Send the key anywhere other than the upstream provider
```

This is the **no-custody** model: InferShield provides security inspection without taking custody of your credentials.

---

## Related Docs

- [QUICKSTART.md](./QUICKSTART.md) — Full setup with TLS certificate installation
- [THREAT_MODEL.md](./THREAT_MODEL.md) — What InferShield protects against
- [PII_REDACTION.md](./PII_REDACTION.md) — How redaction works
- [MANUAL_INTEGRATION.md](./MANUAL_INTEGRATION.md) — SDK/API integration patterns
- [backend/README-PROXY.md](../backend/README-PROXY.md) — Proxy architecture internals
