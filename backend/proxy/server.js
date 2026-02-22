const Proxy = require('http-mitm-proxy').Proxy;
const fs = require('fs');
const path = require('path');
const { scanRequest, scanResponse } = require('./interceptor');
const { ensureCertificate } = require('./cert-manager');

const config = require('./config');

const proxy = new Proxy();

// Ensure certificate exists
ensureCertificate();

proxy.onError((ctx, err) => {
  console.error('Proxy error:', err);
});

// Intercept requests
proxy.onRequest((ctx, callback) => {
  const url = ctx.clientToProxyRequest.url || ctx.clientToProxyRequest.headers.host;
  console.log(`📡 [Request] ${ctx.clientToProxyRequest.method} ${url}`);
  scanRequest(ctx, callback);
});

// Intercept responses
proxy.onResponse((ctx, callback) => {
  // Skip if request was blocked (no upstream response exists)
  if (ctx.isBlocked) {
    callback();
    return;
  }
  
  console.log(`📥 [Response] ${ctx.serverToProxyResponse.statusCode}`);
  scanResponse(ctx, callback);
});

const port = config.port || 8888;
proxy.listen({
  port,
  host: '127.0.0.1',  // Bind to localhost instead of 0.0.0.0
  sslCaDir: path.join(__dirname, '../certs'),
  keepAlive: true,
  forceSNI: true  // Force SNI for HTTPS
}, () => {
  console.log(`✅ Proxy server listening on 127.0.0.1:${port}`);
  console.log(`📁 Certificate location: ${path.join(__dirname, '../certs/infershield-ca.crt')}`);
  console.log(`🔍 Monitoring: OpenAI, Anthropic, Google AI, Cohere, Together`);
  console.log(`\n💡 To use: export HTTPS_PROXY=http://localhost:${port}\n`);
});