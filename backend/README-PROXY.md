# InferShield Proxy Mode

The InferShield Proxy allows automatic interception and scanning of AI traffic to detect PII and secrets. This mode operates as a forward proxy with TLS interception.

## Features

- 🔍 **Automatic Scanning**: Intercepts all AI API traffic (OpenAI, Anthropic, Google, Cohere)
- 🛡️ **Real-time Protection**: Blocks requests containing API keys, SSNs, credit cards, emails
- 📊 **Risk Scoring**: Calculates risk score (0-100) for each request
- 📝 **Database Logging**: Stores all scans in SQLite for audit trail
- 🔐 **TLS Interception**: Man-in-the-middle proxy with self-signed root CA
- 🖥️ **Cross-Platform**: Works on Linux, macOS, and Windows

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Start Proxy Server

```bash
node proxy/server.js
```

By default, the proxy listens on port **8888**.

You should see:
```
Generating new root CA certificate...
Root CA generated at backend/certs/infershield-ca.crt
Proxy server listening on port 8888
```

### 3. Configure System to Use Proxy

#### Linux / macOS

```bash
export HTTPS_PROXY=http://localhost:8888
```

#### Windows (PowerShell)

```powershell
$env:HTTPS_PROXY="http://localhost:8888"
```

#### Windows (Command Prompt)

```cmd
set HTTPS_PROXY=http://localhost:8888
```

### 4. Install Root Certificate (Required for HTTPS)

The proxy generates a self-signed root CA at: `backend/certs/infershield-ca.crt`

You **must** install this certificate to your system's trust store for HTTPS interception to work.

#### macOS

1. Open **Keychain Access** app
2. Drag `backend/certs/infershield-ca.crt` into the **System** keychain
3. Double-click the certificate → **Trust** section → Set to **Always Trust**

#### Linux (Ubuntu/Debian)

```bash
sudo cp backend/certs/infershield-ca.crt /usr/local/share/ca-certificates/infershield-ca.crt
sudo update-ca-certificates
```

#### Windows

**Option A: GUI (Recommended)**

1. Double-click `backend\certs\infershield-ca.crt`
2. Click **Install Certificate**
3. Select **Local Machine** (requires admin)
4. Choose **Place all certificates in the following store**
5. Click **Browse** → Select **Trusted Root Certification Authorities**
6. Click **Next** → **Finish**

**Option B: PowerShell (Admin)**

```powershell
# Run PowerShell as Administrator
Import-Certificate -FilePath "backend\certs\infershield-ca.crt" -CertStoreLocation Cert:\LocalMachine\Root
```

## Usage

Once the proxy is running and the certificate is installed, all HTTPS traffic will be intercepted automatically.

### Testing

Test with a sample OpenAI API call:

**Linux/macOS:**
```bash
export HTTPS_PROXY=http://localhost:8888
node backend/proxy/test-proxy.js
```

**Windows (PowerShell):**
```powershell
$env:HTTPS_PROXY="http://localhost:8888"
node backend\proxy\test-proxy.js
```

### Real API Call Example

```bash
export HTTPS_PROXY=http://localhost:8888

curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-YOUR_KEY_HERE" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

If you accidentally include sensitive data in the prompt, InferShield will:
1. Detect it (API keys, SSNs, credit cards, etc.)
2. Calculate a risk score
3. Block the request (if severity is critical)
4. Log to database for audit

## What Gets Detected

### Critical (Auto-Block)
- ✅ OpenAI API Keys (`sk-...`)
- ✅ Anthropic API Keys (`sk-ant-...`)
- ✅ Google API Keys (`AIza...`)
- ✅ AWS Access Keys (`AKIA...`)
- ✅ GitHub Tokens (`ghp_...`, `ghs_...`)

### High Severity
- ⚠️ Credit Card Numbers (Visa, Mastercard, Amex, etc.)
- ⚠️ Social Security Numbers (###-##-####)

### Medium Severity
- 📧 Email Addresses
- 📞 Phone Numbers

### Low Severity
- 🌐 IP Addresses

## Database

All scans are logged to `backend/database.db` (SQLite).

### Tables

**`api_requests`** - All intercepted requests
- `id`, `timestamp`, `url`, `method`, `request_body`, `response_body`, `risk_score`, `blocked`

**`pii_detections`** - Detected PII/secrets
- `id`, `request_id`, `timestamp`, `detection_type`, `pattern`, `severity`, `description`, `provider`, `redacted_value`

### Viewing Logs

```bash
sqlite3 backend/database.db "SELECT * FROM api_requests ORDER BY timestamp DESC LIMIT 10;"
```

## Configuration

Edit `backend/proxy/config.js`:

```javascript
module.exports = {
  port: 8888,           // Proxy port
  logLevel: 'info',     // verbose, info, warn, error
  blockMode: 'auto'     // auto, warn, off
};
```

## Troubleshooting

### "Certificate Verify Failed" Error

**Problem:** The root CA is not installed or not trusted.

**Solution:**
- Verify certificate is installed in system trust store
- Try: `export NODE_TLS_REJECT_UNAUTHORIZED=0` (development only, not recommended for production)

### "ECONNREFUSED" Error

**Problem:** Proxy server is not running.

**Solution:**
```bash
node backend/proxy/server.js
```

### No Traffic Intercepted

**Problem:** Environment variable not set or wrong port.

**Solution:**
```bash
# Check environment variable
echo $HTTPS_PROXY   # Linux/macOS
echo %HTTPS_PROXY%  # Windows CMD
$env:HTTPS_PROXY    # Windows PowerShell

# Should output: http://localhost:8888
```

### Windows-Specific: PowerShell Execution Policy

**Problem:** PowerShell blocks script execution.

**Solution:**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Architecture

```
┌─────────────┐      HTTPS       ┌──────────────┐      HTTPS       ┌─────────────┐
│   Client    │ ───────────────> │  InferShield │ ───────────────> │  AI API     │
│ (curl, IDE) │                  │    Proxy     │                  │  (OpenAI)   │
└─────────────┘                  └──────────────┘                  └─────────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Scanner  │ Detects PII/Secrets
                                  └──────────┘
                                        │
                                        ▼
                                  ┌──────────┐
                                  │ Database │ Logs requests
                                  └──────────┘
```

## Performance

- **Latency**: ~5-10ms per request (scanning overhead)
- **Throughput**: ~1000 requests/sec (single-threaded)
- **Memory**: ~50MB baseline + ~1KB per request

## Security Notes

⚠️ **Development Use Only**

This proxy is designed for **development and testing**. For production use:
- Use a proper certificate authority (not self-signed)
- Implement rate limiting
- Add authentication/authorization
- Deploy in a secure environment
- Consider compliance requirements (GDPR, HIPAA, etc.)

## Support

- Issues: https://github.com/InferShield/infershield/issues
- Docs: https://docs.infershield.io
- Discord: https://discord.gg/infershield

---

**Built with ❤️ by InferShield**
