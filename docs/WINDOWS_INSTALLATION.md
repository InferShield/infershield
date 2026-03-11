# InferShield — Windows 10/11 Installation Guide

> **Issue #77 — Windows Validation** | Milestone M1.1 (P0)

This guide walks through installing and running InferShield on Windows 10 (20H1+) and Windows 11.

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Running the Proxy](#running-the-proxy)
6. [Chrome Extension Setup](#chrome-extension-setup)
7. [OAuth Token Management](#oauth-token-management)
8. [Windows Firewall](#windows-firewall)
9. [Troubleshooting](#troubleshooting)
10. [Known Windows-Specific Limitations](#known-windows-specific-limitations)

---

## System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Windows 10 (build 19041 / 20H1) | Windows 11 |
| Architecture | x64 | x64 or ARM64 |
| RAM | 4 GB | 8 GB |
| Disk | 500 MB | 2 GB |
| Node.js | v18 LTS | v20 LTS |
| Chrome | v120+ | Latest stable |

---

## Prerequisites

### 1. Node.js

Download and install Node.js LTS from [nodejs.org](https://nodejs.org).

Verify installation in PowerShell:

```powershell
node --version   # v18.x.x or higher
npm --version    # 9.x.x or higher
```

### 2. Git

Download from [git-scm.com](https://git-scm.com/download/win).

```powershell
git --version
```

### 3. Docker Desktop (Optional)

Only required if running the backend firewall service in Docker.

Download from [docker.com](https://www.docker.com/products/docker-desktop/).

> **Note:** Docker Desktop on Windows requires WSL 2 or Hyper-V. Enable one of these in Windows Features.

### 4. Windows Credential Manager (Built-in)

InferShield uses Windows Credential Manager for secure OAuth token storage. It is built into Windows — no installation needed.

To verify, open **Start → Credential Manager → Windows Credentials**.

---

## Installation

Open **PowerShell as Administrator**:

```powershell
# Clone the repository
git clone https://github.com/InferShield/infershield.git
cd infershield

# Install backend dependencies
cd backend
npm install

# Optional: Install keytar for Windows Credential Manager integration
# (Falls back to encrypted files if not installed)
npm install keytar
```

> **keytar note:** `keytar` requires native compilation. If `npm install keytar` fails, install [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and retry. InferShield works without keytar using AES-256-GCM encrypted file fallback.

### Run Environment Preflight

```powershell
cd ..
node tests/windows/setup/check-environment.js
```

All checks should pass (warnings are acceptable).

---

## Configuration

### Environment Variables

Create `backend/.env` (copy from `.env.example`):

```powershell
cd backend
copy .env.example .env
notepad .env
```

Key settings for Windows:

```env
# InferShield master key for encrypted token storage
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
INFERSHIELD_MASTER_KEY=<your-64-char-hex-key>

# Proxy port (allow through Windows Firewall if changed)
PROXY_PORT=8000

# Bind address — IMPORTANT: use 0.0.0.0 on Windows
# Windows may resolve "localhost" to ::1 (IPv6); 0.0.0.0 covers both
HOST=0.0.0.0
```

### Generate a Master Key

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output into `INFERSHIELD_MASTER_KEY` in your `.env`.

---

## Running the Proxy

```powershell
cd backend
npm start
```

Expected output:

```
🚀 InferShield proxy listening on 0.0.0.0:8000
✅ Windows Credential Manager: available (keytar)
   — OR —
⚠️  Windows Credential Manager: unavailable, using encrypted file fallback
   Tokens stored at: C:\Users\<you>\.infershield\tokens\
```

### Verify the proxy is running

```powershell
curl http://localhost:8000/health
# Expected: {"status":"ok","platform":"win32"}
```

---

## Chrome Extension Setup

### Load the Extension (Developer Mode)

1. Open Chrome → navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder in the repository

The InferShield shield icon should appear in the Chrome toolbar.

### Configure the Extension

1. Click the InferShield toolbar icon
2. In the popup, ensure **Proxy URL** is set to `http://localhost:8000`
3. Click **Save Settings**

### Windows Firewall Prompt

On first launch, Windows Firewall may show a popup:

> *"Windows Defender Firewall has blocked some features of Node.js..."*

Click **Allow access** for **Private networks**.

---

## OAuth Token Management

InferShield v1.0 includes OAuth Token Management (PR #76) for provider authentication.

### Initiating OAuth Device Flow

```powershell
# From the InferShield CLI or proxy endpoint
curl -X POST http://localhost:8000/auth/device-flow -H "Content-Type: application/json" -d "{\"provider\":\"openai\"}"
```

Response includes a `verification_uri` and `user_code`. Visit the URL in Chrome and enter the code.

### Token Storage on Windows

Tokens are stored in **Windows Credential Manager** (if keytar is installed):

- Open **Start → Credential Manager → Windows Credentials**
- Look for entries under the `infershield` generic credential

Or in encrypted files at `C:\Users\<you>\.infershield\tokens\` (fallback).

### Verify Token Storage

```powershell
curl http://localhost:8000/auth/status
# Expected: {"authenticated":true,"provider":"openai","token_expires_at":...}
```

---

## Windows Firewall

### Automatic Configuration

On first launch, accept the Windows Firewall prompt.

### Manual Configuration (PowerShell, Admin)

```powershell
# Allow InferShield proxy port (8000) for Private networks
netsh advfirewall firewall add rule `
  name="InferShield Proxy" `
  dir=in `
  action=allow `
  protocol=TCP `
  localport=8000 `
  profile=private
```

### Verify

```powershell
netsh advfirewall firewall show rule name="InferShield Proxy"
```

---

## Troubleshooting

### `EADDRINUSE: address already in use :::8000`

Another process is using port 8000.

```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill by PID
taskkill /PID <pid> /F
```

Or change `PROXY_PORT` in `.env`.

### `localhost` not resolving to proxy

Windows 10+ may resolve `localhost` to `::1` (IPv6). Ensure `HOST=0.0.0.0` in `.env`.

If issues persist, use `http://127.0.0.1:8000` explicitly in the Chrome extension settings.

### `keytar` installation fails

```powershell
# Install Visual C++ Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools

# Retry keytar
npm install keytar
```

If keytar still fails, InferShield automatically falls back to encrypted file storage — **no functionality is lost**.

### Chrome Extension Not Intercepting Requests

1. Verify extension is loaded at `chrome://extensions`
2. Ensure the extension is **enabled** (toggle is blue)
3. Reload the target page (Ctrl+Shift+R)
4. Check Chrome DevTools → Console for extension errors

### `Error: ENOENT .infershield/tokens`

```powershell
mkdir "$env:USERPROFILE\.infershield\tokens"
```

---

## Known Windows-Specific Limitations

| Issue | Impact | Workaround |
|-------|--------|------------|
| `keytar` requires Visual C++ Build Tools | keytar install may fail | Use encrypted file fallback (automatic) |
| Windows Firewall prompt on first launch | One-time user action required | Accept the prompt or use `netsh` (see above) |
| `localhost` may resolve to `::1` (IPv6) | Proxy unreachable if bound to `127.0.0.1` | Always set `HOST=0.0.0.0` |
| File permission mode `0o600` not enforced by Windows FS | Token files readable by admin | NTFS user-only ACL set automatically |
| `SIGTERM` not available on Windows | Graceful shutdown via signal not supported | Use `Ctrl+C` (SIGINT) or kill the process |
| Docker Desktop requires WSL2 or Hyper-V | May not work on some enterprise images | Run proxy with `npm start` instead of Docker |

---

## Running Windows Validation Tests

```powershell
cd backend
npm run test:windows
```

Expected: **77 tests passing, 0 failures** (on Linux/macOS CI; uses mocks for Windows-specific APIs).

For full hardware validation on a Windows machine, the same command runs the test suite against real Windows APIs (Windows Credential Manager, actual file permissions, etc.).

---

*Document created: Issue #77 — Windows 10/11 Hardware Validation | InferShield M1.1*
