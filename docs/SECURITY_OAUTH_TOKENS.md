# OAuth Token Security Model

This document describes how InferShield handles OAuth tokens — what is stored, where, how it is encrypted, and what happens if something goes wrong.

> **Core principle:** Passthrough custody. InferShield never transmits your OAuth tokens to its own servers. Tokens are stored locally on your machine, encrypted at rest, and used only to forward your requests to the LLM provider.

---

## What InferShield Stores

| Item | Stored? | Location | Encrypted? |
|---|---|---|---|
| OAuth access token | Yes | Local disk | Yes (AES-256-GCM) |
| OAuth refresh token | Yes | Local disk | Yes (AES-256-GCM) |
| Token expiry timestamp | Yes | Local disk | Yes |
| Your LLM API key | No | — | N/A |
| Request contents | No (default) | — | N/A |
| Response contents | No (default) | — | N/A |
| Request metadata (risk score, timestamp) | Yes | Local audit log | No |

**InferShield servers receive:** Nothing. In OSS/self-host mode, there are no InferShield servers involved.

---

## Token Storage

### File location

Tokens are stored in:

\`\`\`
~/.infershield/tokens.json        (single-user mode)
/data/tokens/<user_id>.json       (multi-user mode, inside Docker volume)
\`\`\`

### Encryption format

Each token is encrypted with **AES-256-GCM** using a key derived from your `INFERSHIELD_MASTER_KEY`:

\`\`\`
Key derivation: PBKDF2-SHA256(INFERSHIELD_MASTER_KEY, salt=user_id, iterations=100,000)
Encryption: AES-256-GCM with random IV per token write
Storage: { iv, authTag, ciphertext } — base64-encoded JSON
\`\`\`

The GCM authentication tag ensures integrity — tampered ciphertext is rejected before decryption.

### Token file structure (conceptual, pre-encryption)

\`\`\`json
{
  "user_id": "alex@example.com",
  "provider": "openai",
  "access_token": "<plaintext — never written to disk>",
  "refresh_token": "<plaintext — never written to disk>",
  "expires_at": 1740000000,
  "created_at": 1708000000
}
\`\`\`

On disk, the access and refresh tokens are ciphertext blobs. The master key is never written to disk.

---

## Master Key

`INFERSHIELD_MASTER_KEY` is the root secret. It is:

- Provided by you at startup (environment variable)
- Never written to disk by InferShield
- Never logged
- Used only for key derivation at token read/write time

**Generate a strong key:**

\`\`\`bash
openssl rand -hex 32
\`\`\`

**Store it safely:** Use a secrets manager (e.g., Vault, AWS Secrets Manager, macOS Keychain) or a password manager. Losing this key means losing access to stored tokens — you will need to re-authenticate.

---

## Token Lifecycle

### 1. Acquisition (device flow)

1. You run `infershield auth login openai`
2. InferShield initiates an OAuth Device Authorization request to the provider
3. You authorize in-browser; the provider issues tokens directly to InferShield (running locally)
4. Tokens are immediately encrypted and written to disk
5. The plaintext tokens are zeroed from memory

### 2. Use (per request)

1. IDE sends a request to `http://localhost:8000/v1/...`
2. InferShield decrypts the access token from disk using `INFERSHIELD_MASTER_KEY`
3. Threat detection runs on the request (prompt injection, PII, etc.)
4. If not blocked: request is forwarded with `Authorization: Bearer <access_token>`
5. Token plaintext is not retained after the request completes

### 3. Refresh (automatic)

Tokens are refreshed automatically when fewer than 5 minutes remain before expiry:

1. InferShield decrypts the stored refresh token
2. Calls the provider's token refresh endpoint
3. New access + refresh tokens are encrypted and written back to disk
4. Old tokens are overwritten (not appended)

### 4. Revocation

**User-initiated:**
\`\`\`bash
infershield auth logout openai        # revoke single provider
infershield auth logout --all         # revoke all providers
\`\`\`

This calls the provider's token revocation endpoint, then deletes the local encrypted token file.

**Admin-initiated (multi-user):**
\`\`\`bash
infershield admin revoke alex@example.com openai
\`\`\`

**Automatic:**
- On repeated 401 responses from the provider (token invalidated upstream)
- On failed refresh (refresh token expired or revoked)

---

## Blast Radius

If `~/.infershield/tokens.json` is compromised:

| Scenario | Impact | Mitigation |
|---|---|---|
| File exfiltrated, master key unknown | No impact — ciphertext is useless without the key | Keep master key separate from token file |
| File exfiltrated with master key | Attacker can decrypt tokens and call LLM APIs | Rotate tokens immediately: `infershield auth logout --all && infershield auth login openai` |
| Master key compromised alone | No impact without the token file | N/A |
| Both compromised | Attacker has LLM API access until tokens expire or are revoked | Revoke tokens at the provider (OpenAI dashboard, GitHub settings) |

**Token expiry limits blast radius:** Access tokens typically expire in 1 hour. An attacker has, at most, until the next token expiry to use a stolen access token — after which they would also need the refresh token.

---

## Token Rotation

### When to rotate

- Suspected compromise (device stolen, key leaked, breach notification)
- Staff/developer offboarding (multi-user mode)
- Periodic rotation policy (enterprise: recommend every 90 days)

### How to rotate

**Single user:**
\`\`\`bash
infershield auth logout openai
infershield auth login openai
\`\`\`

**Admin (multi-user):**
\`\`\`bash
infershield admin revoke alex@example.com openai
# Notify alex to re-authenticate
infershield auth login openai --user alex@example.com
\`\`\`

**Rotate master key:**
\`\`\`bash
# 1. Export tokens (decrypts with old key)
infershield admin export-tokens --out /tmp/tokens-backup.json

# 2. Update INFERSHIELD_MASTER_KEY in .env

# 3. Re-import (encrypts with new key)
infershield admin import-tokens --in /tmp/tokens-backup.json

# 4. Delete the plaintext backup
shred -u /tmp/tokens-backup.json
\`\`\`

---

## Audit Logs

Every request is logged with metadata (no content by default):

\`\`\`json
{
  "timestamp": "2026-03-01T22:34:00Z",
  "request_id": "req_abc123",
  "user_id": "alex@example.com",
  "provider": "openai",
  "endpoint": "/v1/chat/completions",
  "risk_score": 15,
  "blocked": false,
  "latency_ms": 342
}
\`\`\`

Logs are written to `~/.infershield/audit.log` (single-user) or `/data/audit.log` (Docker).

**Content logging** (request/response bodies) is **disabled by default** for privacy. Enable with:
\`\`\`bash
INFERSHIELD_LOG_CONTENT=true
\`\`\`

> Enabling content logging means sensitive prompts may appear in your local log files. Treat them accordingly.

---

## Enterprise Security Notes

For enterprise or team deployments:

- **Store `INFERSHIELD_MASTER_KEY` in a secrets manager** (Vault, AWS SSM, Azure Key Vault). Never commit it to source control.
- **Use volume encryption** for the Docker volume containing token files (e.g., LUKS, EBS encryption).
- **Enable audit log export** to a SIEM for compliance and incident response.
- **RBAC/SSO:** Multi-user mode supports per-user token isolation. SSO/SAML integration is on the v1.0 roadmap.
- **Network segmentation:** Run InferShield on localhost or a private network — it does not need to be internet-accessible.

---

## References

- [OAuth 2.0 Device Authorization Grant (RFC 8628)](https://datatracker.ietf.org/doc/html/rfc8628)
- [OAuth 2.0 Token Revocation (RFC 7009)](https://datatracker.ietf.org/doc/html/rfc7009)
- [OAuth Architecture (internal)](./OAUTH_ARCHITECTURE.md)
- [OAuth Setup Guide](./OAUTH_SETUP.md)
- [Threat Model](./THREAT_MODEL.md)
