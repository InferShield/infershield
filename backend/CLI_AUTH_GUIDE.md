# InferShield CLI Authentication - Quick Start Guide

## Overview

The InferShield CLI provides IDE-side commands to authenticate with OAuth providers using the Device Flow (RFC 8628).

## Installation

```bash
cd backend
npm install
npm link  # Makes 'infershield' command available globally
```

## Commands

### Login (Initiate Device Flow)

```bash
# Login with default provider (OpenAI)
infershield auth login

# Login with specific provider
infershield auth login --provider openai

# Login with custom scopes
infershield auth login --provider openai --scope "api read write"

# Login without automatic browser launch
infershield auth login --no-browser
```

**Flow:**
1. Device code requested from authorization server
2. Device code + verification URL displayed
3. Browser launched automatically (opens verification URL)
4. User enters code and authorizes
5. CLI polls for token
6. Token stored securely on success

### Logout (Revoke Tokens)

```bash
# Logout from specific provider
infershield auth logout --provider openai

# Logout from all providers
infershield auth logout --all
```

### Status (Show Active Sessions)

```bash
# Human-readable status
infershield auth status

# JSON output (for scripting)
infershield auth status --json
```

**Output includes:**
- Active providers
- Token scopes
- Expiration status
- Time remaining

### Refresh (Manual Token Refresh)

```bash
# Refresh tokens for provider
infershield auth refresh --provider openai
```

**Implementation Status:**
- Command structure and CLI interface: ✅ Implemented (commit 7c2e830)
- Token refresh API call: ⏳ Stub only (implementation deferred to Issue #4)

The `infershield auth refresh` command is available and accepts the `--provider` flag, but the actual token refresh logic (calling the OAuth provider's token endpoint, validating refresh tokens, and updating stored credentials) is not yet implemented. The command will acknowledge the request but will not perform token refresh until Issue #4 (Token Management) is completed.

*Note: Full token refresh implementation (refresh_token validation, provider API calls, automatic token renewal) will be completed in Issue #4 (Token Management)*

## Example Session

```bash
$ infershield auth login --provider openai
╔═══════════════════════════════════════════════════════╗
║  InferShield OAuth Authentication                     ║
╚═══════════════════════════════════════════════════════╝

📡 Initiating OAuth Device Flow...
   Provider: openai
   Scope: api

✓ Device authorization initiated

═══════════════════════════════════════════════════════
  AUTHORIZATION REQUIRED
═══════════════════════════════════════════════════════

  Your code: WDJB-MJHT

  Verification URL: https://auth.openai.com/device

  Code expires in: 900 seconds
═══════════════════════════════════════════════════════

🌐 Launching browser...

Opening your browser...
✓ Browser launched successfully

Please complete authorization in your browser.
Enter code: WDJB-MJHT

⏳ Waiting for authorization...

...............

✓ Authorization successful!

✓ Tokens stored securely

═══════════════════════════════════════════════════════
  Authentication Complete
═══════════════════════════════════════════════════════

  Provider: openai
  Scope: api
  Expires in: 3600 seconds

You can now use InferShield with this provider.

$ infershield auth status
🔐 InferShield Authentication Status

═══════════════════════════════════════════════════════

Provider: openai
  Scope: api
  Status: ✅ Active
  Expires: 2026-03-02 18:42:00
  Time remaining: 0h 59m
```

## Integration with Existing Components

The CLI integrates all Device Flow components:

1. **authorization-server.js** (dd34808) - Device authorization endpoint
2. **device-code-manager.js** (023f61f) - Device code storage
3. **polling-manager.js** (a119fa7) - Token polling with backoff
4. **browser-launcher.js** (e93a382) - Cross-platform browser launch
5. **token-storage.js** (f0f86cd) - Secure token persistence

## Error Handling

- **Browser launch failure**: Falls back to manual instructions
- **Authorization denied**: Clear error message, exits gracefully
- **Device code expiration**: Timeout with helpful message
- **Rate limiting**: Automatic exponential backoff
- **Polling violations**: Enforced by polling-manager

## Testing

```bash
# Run CLI tests
npm test tests/cli/auth.test.js

# All 14 tests passing:
# - Success flow
# - Browser failure handling
# - Authorization denial
# - No-browser mode
# - Rate limit handling
# - Logout (single/all)
# - Status display
# - Refresh command
```

## Architecture

```
┌─────────────────┐
│   CLI Command   │  (bin/infershield)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Auth Handler   │  (cli/commands/auth.js)
└────────┬────────┘
         │
         ├──► Authorization Server (device code request)
         ├──► Device Code Manager (storage)
         ├──► Browser Launcher (open verification URL)
         ├──► Polling Manager (token polling)
         └──► Token Storage (secure persistence)
```

## Next Steps

After authentication:
- Tokens are stored securely in platform keyring (or encrypted fallback)
- Access tokens can be retrieved via `tokenStorage.getToken(providerId)`
- Automatic refresh will be implemented in Issue #4
- Provider integrations will be added in Issue #8

## Troubleshooting

**Browser doesn't launch:**
- Check platform support (macOS, Linux, Windows)
- Use `--no-browser` and open URL manually
- Verify system browser is configured

**Token storage fails:**
- Platform keyring not available → uses encrypted fallback
- Check file permissions on `~/.infershield/tokens/`
- Ensure Node.js has filesystem access

**Polling timeout:**
- Device code expires after 15 minutes
- Complete authorization within expiry window
- Run `infershield auth login` again if expired

## Security Notes

- Device codes are cryptographically random (256 bits)
- User codes expire after 15 minutes
- Tokens stored with AES-256-GCM encryption (fallback mode)
- Platform keyring preferred (hardware-backed)
- No plaintext token storage
- File permissions: Unix 0600, Windows user-only ACLs

---

**Commit:** 0754c10
**Issue:** #1 (OAuth Device Flow)
**Task:** Task 6 - IDE Authentication Trigger
**Status:** ✅ Complete (14/14 tests passing)
