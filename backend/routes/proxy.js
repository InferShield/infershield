/**
 * Passthrough Proxy Routes
 * 
 * OpenAI-API compatible endpoints that forward to upstream providers
 * after authentication and threat analysis.
 */

const express = require('express');
const router = express.Router();
const passthroughProxy = require('../services/passthrough-proxy');

// POST /v1/chat/completions (OpenAI format)
router.post('/chat/completions', async (req, res) => {
  await passthroughProxy.handleProxyRequest(req, res, '/chat/completions');
});

// POST /v1/completions (OpenAI legacy)
router.post('/completions', async (req, res) => {
  await passthroughProxy.handleProxyRequest(req, res, '/completions');
});

// POST /v1/messages (Anthropic format)
router.post('/messages', async (req, res) => {
  await passthroughProxy.handleProxyRequest(req, res, '/messages');
});

// POST /v1/embeddings (OpenAI format)
router.post('/embeddings', async (req, res) => {
  await passthroughProxy.handleProxyRequest(req, res, '/embeddings');
});

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'InferShield Passthrough Proxy',
    mode: 'passthrough',
    key_custody: false,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
