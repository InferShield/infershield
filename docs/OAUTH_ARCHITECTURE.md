# OAuth Device Flow Architecture (v0.2)

## Goal

Support IDE integrations (GitHub Copilot, Cursor, Windsurf) that use OAuth device flows instead of API keys.

## Current vs. Target Architecture

### Current (v0.1) - API Key Pass-Through
```
User App → InferShield Proxy (with API key) → OpenAI API
           ↓
    Threat Detection
```

**Limitation:** Requires API key in environment. Doesn't work with OAuth-based tools.

### Target (v0.2) - OAuth Device Flow Support
```
IDE (Cursor/Copilot) → InferShield OAuth Proxy → GitHub/OpenAI OAuth → LLM
                              ↓
                      Threat Detection + Token Management
```

## OAuth Device Flow Steps

### 1. Device Authorization

**User initiates:**
```bash
infershield auth login
```

**InferShield:**
1. Generates device code + user code
2. Displays to user:
   ```
   Visit: https://github.com/login/device
   Code: XXXX-YYYY
   ```
3. Polls OAuth provider for token

**User:**
- Opens browser
- Enters code
- Authorizes InferShield

**InferShield receives:**
- Access token
- Refresh token
- Token expiry

### 2. Token Storage

Store tokens securely (encrypted at rest):

```json
{
  "user_id": "alex@example.com",
  "provider": "openai",
  "access_token": "encrypted_xxx",
  "refresh_token": "encrypted_yyy",
  "expires_at": 1708542000,
  "created_at": 1708538400
}
```

**Storage options:**
- **v0.2 (single-user):** Encrypted JSON file
- **v0.3 (multi-user):** SQLite + encryption
- **Enterprise:** PostgreSQL + Vault integration

### 3. Request Proxying

**IDE makes request:**
```
POST http://localhost:8000/v1/chat/completions
Authorization: Bearer <infershield_token>
```

**InferShield:**
1. Validates InferShield token
2. Looks up stored OAuth tokens
3. Refreshes if expired
4. **Runs threat detection** on request
5. Forwards to LLM with OAuth token
6. Logs request + response

### 4. Token Refresh

**Auto-refresh logic:**
```javascript
async function getValidToken(userId, provider) {
  const stored = await tokenStore.get(userId, provider);
  
  if (Date.now() < stored.expires_at - 300000) {
    // Token valid for >5 min
    return stored.access_token;
  }
  
  // Token expired or expiring soon - refresh
  const refreshed = await oauthProvider.refresh(stored.refresh_token);
  
  await tokenStore.update(userId, provider, {
    access_token: refreshed.access_token,
    refresh_token: refreshed.refresh_token,
    expires_at: Date.now() + refreshed.expires_in * 1000
  });
  
  return refreshed.access_token;
}
```

## Implementation Plan

### Phase 1: Single-User OAuth (v0.2)

**Scope:** One developer, one machine

**Components:**
1. **CLI:** `infershield auth login/logout/status`
2. **Token storage:** Encrypted JSON (~/.infershield/tokens.json)
3. **OAuth client:** GitHub, OpenAI device flow
4. **Proxy updates:** Accept InferShield auth tokens

**Files to create:**
```
proxy/
  ├── auth/
  │   ├── device-flow.js      # OAuth device flow logic
  │   ├── token-store.js      # Encrypted token storage
  │   └── token-refresh.js    # Auto-refresh logic
  ├── cli/
  │   └── auth-cli.js          # CLI commands
  └── middleware/
      └── oauth-auth.js        # Request authentication
```

**Example usage:**
```bash
# Authenticate once
$ infershield auth login openai
Visit: https://github.com/login/device
Code: ABCD-1234
✓ Authenticated as alex@example.com

# IDE connects via InferShield
$ export OPENAI_BASE_URL=http://localhost:8000/v1
$ cursor  # Uses InferShield automatically
```

### Phase 2: Multi-User OAuth (v0.3)

**Scope:** Team deployments, multiple developers

**New components:**
4. **User management:** CLI user creation
5. **Token isolation:** Per-user token storage
6. **Admin CLI:** User list, revoke, audit

**Database schema:**
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  created_at INTEGER
);

CREATE TABLE oauth_tokens (
  user_id TEXT,
  provider TEXT,
  access_token_encrypted BLOB,
  refresh_token_encrypted BLOB,
  expires_at INTEGER,
  PRIMARY KEY (user_id, provider),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  request_id TEXT,
  timestamp INTEGER,
  risk_score INTEGER,
  blocked BOOLEAN
);
```

### Phase 3: Enterprise OAuth (v1.0)

**Scope:** Large organizations, SSO, compliance

**New components:**
7. **SSO integration:** SAML, Okta, Azure AD
8. **Centralized token management:** Admin dashboard
9. **Per-user compliance reporting:** Audit exports
10. **Team policies:** Different rules per team

## Provider-Specific OAuth Flows

### OpenAI Device Flow

**Authorization endpoint:**
```
POST https://api.openai.com/v1/oauth/device/code
```

**Token endpoint:**
```
POST https://api.openai.com/v1/oauth/token
```

**Scopes needed:**
- `api.read`
- `api.write`

### GitHub Copilot Flow

**Authorization endpoint:**
```
POST https://github.com/login/device/code
```

**Token endpoint:**
```
POST https://github.com/login/oauth/access_token
```

**API endpoint:**
```
https://api.githubcopilot.com/
```

### Anthropic OAuth

**Status:** Not publicly available yet (API keys only)

**Fallback:** Support API key mode for Anthropic until OAuth available

## Security Considerations

### Token Encryption

**Encryption key derivation:**
```javascript
const encryption_key = pbkdf2(
  password: process.env.INFERSHIELD_MASTER_KEY,
  salt: user_id,
  iterations: 100000,
  keylen: 32,
  digest: 'sha256'
);
```

**Encryption algorithm:**
- AES-256-GCM
- Random IV per token
- Store: `{iv, authTag, ciphertext}`

### Token Revocation

**User-initiated:**
```bash
$ infershield auth logout openai
✓ Token revoked. Re-authenticate to continue.
```

**Admin-initiated (multi-user):**
```bash
$ infershield admin revoke alex@example.com openai
✓ Revoked OpenAI token for alex@example.com
```

**Automatic:**
- On OAuth refresh failure (token invalidated)
- On repeated auth errors (compromised token)

### Audit Trail

**Log every token use:**
```json
{
  "timestamp": 1708538400,
  "user_id": "alex@example.com",
  "provider": "openai",
  "action": "chat.completion",
  "risk_score": 15,
  "blocked": false,
  "request_id": "req_abc123"
}
```

## Testing Strategy

### Unit Tests

1. **Device flow simulation:** Mock OAuth responses
2. **Token encryption/decryption:** Verify no data loss
3. **Token refresh logic:** Test expiry handling
4. **Error handling:** Invalid tokens, network failures

### Integration Tests

1. **End-to-end flow:** CLI login → IDE request → LLM response
2. **Token persistence:** Restart proxy, tokens still valid
3. **Multi-user isolation:** User A can't access User B's tokens
4. **Threat detection:** OAuth requests still get scanned

### Manual Testing

1. **GitHub Copilot:** Authenticate, use Copilot in VS Code
2. **Cursor:** Authenticate, use Cursor AI features
3. **Token expiry:** Wait for token expiry, verify auto-refresh
4. **Revocation:** Logout, verify requests fail

## Deployment Guide (v0.2)

### Single Developer Setup

```bash
# 1. Update InferShield
git pull origin main

# 2. Install CLI
npm install -g @infershield/cli

# 3. Authenticate
infershield auth login openai
# Follow browser prompts

# 4. Start proxy
docker run -p 8000:8000 \
  -v ~/.infershield:/root/.infershield \
  infershield/proxy:v0.2

# 5. Configure IDE
export OPENAI_BASE_URL=http://localhost:8000/v1

# 6. Use normally
cursor  # All requests secured automatically
```

### Team Setup

```bash
# 1. Start proxy (team mode)
docker run -p 8000:8000 \
  -e INFERSHIELD_MODE=multi-user \
  -e INFERSHIELD_MASTER_KEY=<secret> \
  -v /opt/infershield:/data \
  infershield/proxy:v0.3

# 2. Create users
infershield admin create-user alex@example.com
infershield admin create-user jordan@example.com

# 3. Each developer authenticates
infershield auth login openai --user alex@example.com
```

## Timeline

- **Week 1:** OAuth device flow implementation
- **Week 2:** Token storage + refresh logic
- **Week 3:** CLI + proxy integration
- **Week 4:** Testing + documentation
- **Week 5:** v0.2 release (single-user OAuth)

**Target:** v0.2 release by mid-March 2026

## Open Questions

1. **Token expiry:** How long should tokens be cached? (Default: match provider expiry)
2. **Master key:** Where should INFERSHIELD_MASTER_KEY come from? (User-provided, or generate + store?)
3. **Token sharing:** Should tokens be shared across machines? (No for v0.2, optional for v0.3)
4. **Provider priority:** Which OAuth provider first? (OpenAI or GitHub Copilot?)

## References

- [GitHub Device Flow Docs](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps#device-flow)
- [OpenAI OAuth Docs](https://platform.openai.com/docs/api-reference/authentication)
- [copilot-api-proxy Implementation](https://github.com/dlenski/copilot-api-proxy)
- [OAuth 2.0 Device Flow RFC](https://datatracker.ietf.org/doc/html/rfc8628)

---

**Status:** Design complete, ready for implementation
**Issue:** https://github.com/InferShield/infershield/issues/1
