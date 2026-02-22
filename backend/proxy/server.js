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

proxy.onRequest((ctx, callback) => {
  console.log(`Intercepted request to: ${ctx.clientToProxyRequest.url}`);
  scanRequest(ctx.clientToProxyRequest, (action) => {
    if (action === 'block') {
      ctx.proxyToClientResponse.writeHead(403);
      ctx.proxyToClientResponse.end('Blocked by InferShield');
      console.warn('Request blocked due to policy enforcement.');
    } else {
      callback();
    }
  });
});

proxy.onResponse((ctx, callback) => {
  scanResponse(ctx.proxyToClientResponse, (action) => {
    if (action === 'block') {
      ctx.proxyToClientResponse.writeHead(403);
      ctx.proxyToClientResponse.end('Blocked by InferShield');
      console.warn('Response blocked due to policy enforcement.');
    } else {
      callback();
    }
  });
});

const port = config.port || 8888;
proxy.listen({
  port,
  sslCaDir: path.join(__dirname, '../certs')
}, () => {
  console.log(`Proxy server listening on port ${port}`);
});