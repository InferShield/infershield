# InferShield Proxy Mode

The InferShield Proxy allows automatic interception and scanning of AI traffic to detect PII and secrets. This mode operates as a forward proxy with TLS interception.

## Setup Instructions

### Install Dependencies
Ensure you have Node.js installed. Install necessary dependencies:

```bash
npm install
```

### Start Proxy Server
Run the proxy server:

```bash
node backend/proxy/server.js
```

By default, the proxy listens on port `8888`.

### Configure System to Use Proxy
#### Linux / macOS

Export the `HTTPS_PROXY` environment variable:

```bash
export HTTPS_PROXY=http://localhost:8888
```

### Install Root Certificate
1. Locate the root CA at:
   - `backend/certs/infershield-ca.crt`
2. Add the certificate to your OS trust store:
   - **macOS:** Open Keychain Access, drag the `.crt` file to "System" keychain, and mark as "Always Trust."
   - **Linux:** Place `.crt` in `/usr/local/share/ca-certificates/` and run `sudo update-ca-certificates`.

### Testing
Test proxy with a sample OpenAI API call:

```bash
export HTTPS_PROXY=http://localhost:8888
node test-proxy.js
```

You should see logs indicating interception and scanning.

### Proxy Configuration
- **Port:** 8888 (default)
- **Cert Path:** `backend/certs/`

### Logs
Scanned data is stored in the existing SQLite database (`api_requests`, `pii_detections` tables).