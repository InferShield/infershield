const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PROXY_PORT || 8000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const FIREWALL_ENDPOINT = process.env.FIREWALL_ENDPOINT || 'http://localhost:5000';
const OPENAI_BASE = 'https://api.openai.com/v1';

// KEY_MODE controls how API keys are handled:
//   passthrough (default): Use client's Authorization header verbatim
//   auto:                  Use server key if set, else fall back to client key
//   server (deprecated):   Use server-side OPENAI_API_KEY (requires key to be set)
const KEY_MODE = (process.env.KEY_MODE || 'passthrough').toLowerCase();

if (!['passthrough', 'auto', 'server'].includes(KEY_MODE)) {
  console.error(`ERROR: Invalid KEY_MODE "${KEY_MODE}". Must be one of: passthrough, auto, server`);
  process.exit(1);
}

if (KEY_MODE === 'server') {
  console.warn('\n⚠️  DEPRECATION WARNING: KEY_MODE=server is deprecated.');
  console.warn('   Server-managed API keys will be removed in a future release.');
  console.warn('   Please migrate to KEY_MODE=passthrough (default) where clients');
  console.warn('   supply their own API keys in the Authorization header.\n');
  if (!OPENAI_API_KEY) {
    console.error('ERROR: KEY_MODE=server requires OPENAI_API_KEY to be set.');
    process.exit(1);
  }
}

if (KEY_MODE === 'auto' && !OPENAI_API_KEY) {
  console.warn('[KEY_MODE=auto] OPENAI_API_KEY not set — will use client Authorization headers.');
}

/**
 * Resolve the Authorization header to forward to OpenAI.
 *
 * @param {string|undefined} clientAuthHeader - The Authorization header from the incoming request.
 * @returns {string|null} The Authorization header value to forward, or null if none available.
 */
function resolveAuthorization(clientAuthHeader) {
  switch (KEY_MODE) {
    case 'server':
      return `Bearer ${OPENAI_API_KEY}`;

    case 'auto':
      if (OPENAI_API_KEY) {
        return `Bearer ${OPENAI_API_KEY}`;
      }
      return clientAuthHeader || null;

    case 'passthrough':
    default:
      return clientAuthHeader || null;
  }
}

// Helper: Extract prompt text from OpenAI request
function extractPrompt(body) {
  if (body.messages) {
    // Chat completions
    return body.messages.map(m => m.content).join('\n');
  }
  if (body.prompt) {
    // Legacy completions
    return Array.isArray(body.prompt) ? body.prompt.join('\n') : body.prompt;
  }
  return '';
}

// Helper: Analyze prompt with Firewall
async function analyzePrompt(prompt, agentId) {
  try {
    const response = await axios.post(`${FIREWALL_ENDPOINT}/api/analyze`, {
      prompt,
      agent_id: agentId
    });
    return response.data;
  } catch (error) {
    console.error('Firewall analysis failed:', error.message);
    // Fail open (allow) if firewall is down - or fail closed (block)?
    // For now: fail closed (safer)
    return { status: 'blocked', risk_score: 100, threats: ['Firewall unavailable'] };
  }
}

// Helper: Log interaction
async function logInteraction(prompt, response, analysis, agentId) {
  try {
    await axios.post(`${FIREWALL_ENDPOINT}/api/logs`, {
      agent_id: agentId,
      prompt: prompt.substring(0, 500),
      response: JSON.stringify(response).substring(0, 500),
      status: analysis.status,
      risk_score: analysis.risk_score,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log interaction:', error.message);
  }
}

// Proxy handler for chat completions
app.post('/v1/chat/completions', async (req, res) => {
  const clientAuthHeader = req.headers.authorization;
  const agentId = req.headers['x-agent-id'] || 'unknown-agent';

  const authorization = resolveAuthorization(clientAuthHeader);
  if (!authorization) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const prompt = extractPrompt(req.body);
  console.log(`[${agentId}] Analyzing prompt: ${prompt.substring(0, 50)}...`);

  // Analyze with Firewall
  const analysis = await analyzePrompt(prompt, agentId);
  
  if (analysis.status === 'blocked') {
    console.log(`[${agentId}] ❌ BLOCKED - Risk: ${analysis.risk_score}`);
    return res.status(403).json({
      error: {
        message: `Request blocked by InferShield: ${analysis.threats.join(', ')}`,
        type: 'firewall_block',
        risk_score: analysis.risk_score,
        threats: analysis.threats
      }
    });
  }

  console.log(`[${agentId}] ✅ ALLOWED - Risk: ${analysis.risk_score}`);

  // Forward to OpenAI
  try {
    const openaiResponse = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      req.body,
      {
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
        },
        responseType: req.body.stream ? 'stream' : 'json'
      }
    );

    // Handle streaming
    if (req.body.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      openaiResponse.data.pipe(res);
    } else {
      // Log the interaction
      await logInteraction(prompt, openaiResponse.data, analysis, agentId);
      res.json(openaiResponse.data);
    }
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    res.status(error.response?.status || 500).json({
      error: {
        message: error.response?.data?.error?.message || 'OpenAI API error',
        type: 'openai_error'
      }
    });
  }
});

// Proxy handler for legacy completions
app.post('/v1/completions', async (req, res) => {
  const clientAuthHeader = req.headers.authorization;
  const agentId = req.headers['x-agent-id'] || 'unknown-agent';

  const authorization = resolveAuthorization(clientAuthHeader);
  if (!authorization) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  const prompt = extractPrompt(req.body);
  const analysis = await analyzePrompt(prompt, agentId);
  
  if (analysis.status === 'blocked') {
    return res.status(403).json({
      error: {
        message: `Request blocked by InferShield: ${analysis.threats.join(', ')}`,
        type: 'firewall_block'
      }
    });
  }

  try {
    const openaiResponse = await axios.post(
      `${OPENAI_BASE}/completions`,
      req.body,
      {
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
        }
      }
    );

    await logInteraction(prompt, openaiResponse.data, analysis, agentId);
    res.json(openaiResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: 'OpenAI API error' }
    });
  }
});

// Proxy handler for embeddings
app.post('/v1/embeddings', async (req, res) => {
  const clientAuthHeader = req.headers.authorization;

  const authorization = resolveAuthorization(clientAuthHeader);
  if (!authorization) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  // Embeddings don't need firewall analysis (no prompt injection risk)
  // But we could log them for audit purposes
  
  try {
    const openaiResponse = await axios.post(
      `${OPENAI_BASE}/embeddings`,
      req.body,
      {
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(openaiResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: 'OpenAI API error' }
    });
  }
});

// List models endpoint
app.get('/v1/models', async (req, res) => {
  const clientAuthHeader = req.headers.authorization;
  const authorization = resolveAuthorization(clientAuthHeader);

  if (!authorization) {
    return res.status(401).json({ error: 'Missing Authorization header' });
  }

  try {
    const openaiResponse = await axios.get(`${OPENAI_BASE}/models`, {
      headers: {
        'Authorization': authorization
      }
    });
    res.json(openaiResponse.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || { message: 'OpenAI API error' }
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    firewall: FIREWALL_ENDPOINT,
    key_mode: KEY_MODE,
    timestamp: new Date().toISOString()
  });
});

// Only start listening when run directly (not when required by tests)
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🛡️  InferShield OpenAI Proxy`);
    console.log(`📡 Listening on http://0.0.0.0:${PORT}`);
    console.log(`🔒 Firewall: ${FIREWALL_ENDPOINT}`);
    console.log(`🤖 OpenAI: ${OPENAI_BASE}`);
    console.log(`🔑 Key Mode: ${KEY_MODE}\n`);
    console.log(`Integration: Set OPENAI_API_BASE=http://localhost:${PORT}/v1\n`);
  });
}

module.exports = { app, resolveAuthorization }; // Export for testing
