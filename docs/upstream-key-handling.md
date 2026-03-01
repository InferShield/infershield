# Upstream API Key Handling

InferShield acts as a **transparent security layer** — it inspects, redacts, or blocks requests, but it does **not store or log your upstream API keys**.

---

## Key-Custody Modes

The proxy supports three modes, controlled by the `KEY_MODE` environment variable:

| Mode | Who holds the key | When to use |
|---|---|---|
| `server` *(default)* | InferShield (env var) | Centralised deployments, team proxies |
| `passthrough` | Client (request header) | Personal installs, browser extension, zero-trust setups |
| `auto` | Server if set, else client | Flexible / mixed environments |

### `server` mode (default)

Set `OPENAI_API_KEY` in your environment (or `.env`). Clients do **not** need a key — InferShield adds it before forwarding.

```bash
# .env
KEY_MODE=server
OPENAI_API_KEY=sk-...
```

```bash
# Client — no key required
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

### `passthrough` mode

InferShield does **not** hold any upstream key. Each client supplies its own `Authorization` header, which is forwarded verbatim after security inspection.

```bash
# .env / docker-compose
KEY_MODE=passthrough
# OPENAI_API_KEY not required
```

```bash
# Client supplies key
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-YOUR_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'
```

Python (OpenAI SDK):
```python
from openai import OpenAI

client = OpenAI(
    api_key="sk-YOUR_KEY_HERE",          # forwarded as-is; never stored
    base_url="http://localhost:8000/v1", # route through InferShield
)

response = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello"}],
)
print(response.choices[0].message.content)
```

Docker Compose (passthrough):
```yaml
services:
  proxy:
    image: infershield/proxy
    environment:
      - KEY_MODE=passthrough
      # No OPENAI_API_KEY here — client keeps custody
```

### `auto` mode

If `OPENAI_API_KEY` is set, it is used. If not, the client's `Authorization` header is forwarded. Useful during migration or in mixed environments.

```bash
KEY_MODE=auto
OPENAI_API_KEY=sk-team-key   # optional
```

---

## What InferShield Sees vs. What It Does Not Store

| Data | InferShield inspects | InferShield stores |
|---|---|---|
| Prompt text | ✅ (threat detection) | Truncated excerpt in audit log |
| Response text | ✅ (exfiltration detection) | Truncated excerpt in audit log |
| `Authorization` header | Forwarded, not read | ❌ Never stored |
| Your upstream API key | ❌ Not read in passthrough/auto | ❌ Never stored |
| Model, temperature, etc. | Passed through | ❌ Not stored |

---

## Troubleshooting

### `401` from InferShield

**Passthrough mode:** The client did not supply an `Authorization` header.
```
"Missing Authorization header. In passthrough mode the client must supply Authorization: Bearer <your-api-key>."
```
→ Add `-H "Authorization: Bearer sk-..."` to your request or set `api_key` in your SDK client.

### `401` from upstream OpenAI (after InferShield allowed the request)

The key is invalid or expired.
- In **server** mode: check `OPENAI_API_KEY` in your `.env`.
- In **passthrough** mode: check the key your client is sending.

### `403` from InferShield

The request was blocked by the threat-detection firewall (prompt injection, data exfiltration, etc.). Check the audit log on the dashboard for the risk score and threat labels.

### Missing `OPENAI_API_KEY` on startup (server mode)

```
ERROR: OPENAI_API_KEY not set. Set it in your environment or switch to KEY_MODE=passthrough.
```
→ Either set the env var or switch to `KEY_MODE=passthrough` if clients will supply their own keys.

---

## Deployment Modes

### Docker (recommended)

```bash
# Server mode
KEY_MODE=server OPENAI_API_KEY=sk-... docker compose up

# Passthrough mode (no key server-side)
KEY_MODE=passthrough docker compose up
```

### Local (npm)

```bash
cd proxy
KEY_MODE=passthrough npm start
```

### Browser Extension / IDE Plugin

Extensions operate in **passthrough mode** by design. The user's API key is stored in the extension's local storage and injected as the `Authorization` header per request — it is never sent to InferShield's server.

Set your extension's proxy URL to `http://localhost:8000` (or wherever InferShield runs).

---

## Quick Verification (curl)

```bash
# 1. Start proxy in passthrough mode
KEY_MODE=passthrough npm start

# 2. Send a request with your key
curl http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'

# Expected: OpenAI response streamed back through InferShield
```
