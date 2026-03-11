# Windows 10/11 Validation Tests — Issue #77

This directory contains platform-specific test suites for validating InferShield on Windows 10 and Windows 11.

## Structure

```
tests/windows/
├── README.md                        # This file
├── setup/
│   └── check-environment.js         # Environment preflight checks
├── oauth/
│   ├── device-flow.windows.test.js  # OAuth device flow on Windows
│   └── credential-manager.test.js   # Windows Credential Manager integration
├── extension/
│   └── chrome-passthrough.windows.test.js  # Chrome extension on Windows
├── cross-platform/
│   └── parity.test.js               # Cross-platform parity tests
└── reports/                         # Test reports (gitignored)
```

## Running on Windows

### Prerequisites

See `docs/WINDOWS_INSTALLATION.md` for full setup instructions.

Quick start:

```powershell
# From repo root in PowerShell (Admin)
npm install
npm run test:windows
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `INFERSHIELD_MASTER_KEY` | No | 64-char hex key for encrypted token fallback |
| `TEST_OAUTH_PROVIDER` | No | Override default provider for OAuth tests (default: `openai`) |
| `TEST_SKIP_CREDENTIAL_MANAGER` | No | Set `true` to skip Windows Credential Manager tests |
| `TEST_CHROME_PROFILE` | No | Path to Chrome profile for extension tests |

### CI / Simulated Windows Tests

The tests in this suite are designed to run on actual Windows hosts. When running on Linux/macOS CI:

- `credential-manager.test.js` mocks the Windows Credential Manager API
- Platform-specific path tests use cross-platform path normalization
- `parity.test.js` compares behavior against Linux/macOS results captured in `fixtures/`
