# OAuth Setup Guide (OSS / Self-Host)

> **Model:** Passthrough — InferShield never stores or has custody of your API keys or OAuth tokens. Tokens stay on your machine, encrypted at rest, and are used only to forward your requests.

## Overview

InferShield supports OAuth Device Flow authentication, letting IDEs like GitHub Copilot and Cursor authenticate without requiring you to paste API keys into environment variables.

**What you get:**
- One-time browser-based login per provider
- Automatic token refresh (no re-login until you explicitly revoke)
- All requests still inspected by InferShield threat detection
- Tokens encrypted on disk; not sent to InferShield servers

---

## Prerequisites

- Docker (or Node.js >=18 for non-Docker installs)
- InferShield proxy v0.2+
- An account with your LLM provider (OpenAI, GitHub Copilot, etc.)

---

## Quickstart (Docker Compose)

### 1. Clone and configure

\`\`\`bash
git clone https://github.com/InferShield/infershield.git
cd infershield
cp .env.example .env
\`\`\`

Edit \`.env\`:

\`\`\`bash
# Required: master key used to encrypt your OAuth tokens at rest
# Generate with: openssl rand -hex 32
INFERSHIELD_MASTER_KEY=your-32-byte-hex-key-here

# Optional: port (default 8000)
INFERSHIELD_PORT=8000

# Optional: log level (debug | info | warn | error)
LOG_LEVEL=info
\`\`\`

### 2. Start the proxy

\`\`\`bash
docker-compose up -d
\`\`\`

The proxy starts at \`http://localhost:8000\`.

### 3. Authenticate with your provider

**OpenAI:**
\`\`\`bash
docker exec -it infershield-proxy infershield auth login openai
\`\`\`

**GitHub Copilot:**
\`\`\`bash
docker exec -it infershield-proxy infershield auth login github
\`\`\`

You will see:
\`\`\`
Visit: https://github.com/login/device
Enter code: ABCD-1234

Waiting for authorization...
✓ Authenticated as alex@example.com
  Token expires: 2026-04-01 (auto-refreshes)
\`\`\`

Open the URL in your browser, enter the code, and authorize InferShield. Done.

### 4. Verify auth status

\`\`\`bash
docker exec infershield-proxy infershield auth status
\`\`\`

\`\`\`
Provider    Status      User                   Expires
─────────────────────────────────────────────────────
openai      ✓ Active    alex@example.com       in 59 days (auto-refresh)
github      ✗ Not set   —                      —
\`\`\`

### 5. Point your IDE or app at InferShield

\`\`\`bash
export OPENAI_BASE_URL=http://localhost:8000/v1
\`\`\`

Or configure in your IDE — see [IDE Integration Guide](./IDE_INTEGRATION.md).

Your requests now flow:
\`\`\`
IDE / App → InferShield (threat detection) → LLM provider
\`\`\`

InferShield attaches the stored OAuth token automatically.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|---|---|---|---|
| \`INFERSHIELD_MASTER_KEY\` | Yes | — | 32-byte hex key for token encryption. Generate: \`openssl rand -hex 32\` |
| \`INFERSHIELD_PORT\` | No | \`8000\` | Port the proxy listens on. |
| \`INFERSHIELD_MODE\` | No | \`single-user\` | \`single-user\` or \`multi-user\` |
| \`INFERSHIELD_LOG_LEVEL\` | No | \`info\` | \`debug\`, \`info\`, \`warn\`, or \`error\` |
| \`INFERSHIELD_TOKEN_PATH\` | No | \`~/.infershield/tokens.json\` | Path to encrypted token storage |

---

## Token Storage

Tokens are stored encrypted in \`~/.infershield/tokens.json\`. They are **never sent to InferShield servers**.

\`\`\`
~/.infershield/
└── tokens.json   ← AES-256-GCM encrypted, keyed by INFERSHIELD_MASTER_KEY
\`\`\`

To revoke and delete all stored tokens:

\`\`\`bash
infershield auth logout --all
\`\`\`

---

## Multi-User / Team Setup

\`\`\`bash
# Start in multi-user mode
docker run -p 8000:8000 \
  -e INFERSHIELD_MODE=multi-user \
  -e INFERSHIELD_MASTER_KEY=<secret> \
  -v /opt/infershield:/data \
  infershield/proxy:latest

# Create users
infershield admin create-user alex@example.com

# Each developer authenticates
infershield auth login openai --user alex@example.com
\`\`\`

---

## Troubleshooting

### INFERSHIELD_MASTER_KEY not set

\`\`\`bash
echo "INFERSHIELD_MASTER_KEY=$(openssl rand -hex 32)" >> .env
\`\`\`

### Device code expired before I authorized

Device codes expire in ~15 minutes. Re-run \`infershield auth login openai\`.

### Token refresh failed

Your refresh token may have been revoked by the provider. Re-authenticate:

\`\`\`bash
infershield auth logout openai && infershield auth login openai
\`\`\`

### Requests returning 401 from provider

\`\`\`bash
infershield auth status
\`\`\`

If status is active but requests fail, enable debug logging: \`LOG_LEVEL=debug docker-compose up\`.

### Port already in use

Set \`INFERSHIELD_PORT=8001\` in \`.env\` and update your IDE's base URL.

### Proxy starts but IDE requests timeout

Ensure the IDE is pointing to \`http://localhost:8000/v1\`. Check port mapping:

\`\`\`bash
docker ps | grep infershield
\`\`\`

---

## Next Steps

- [IDE Integration Guide](./IDE_INTEGRATION.md) — Configure Cursor, Copilot, VS Code, and more
- [Token Security Model](./SECURITY_OAUTH_TOKENS.md) — Storage, encryption, rotation, blast radius
- [OAuth Architecture](./OAUTH_ARCHITECTURE.md) — Internal design and flow diagrams
