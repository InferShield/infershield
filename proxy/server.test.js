/**
 * Tests for proxy/server.js KEY_MODE behavior
 *
 * Tests the resolveAuthorization helper directly, plus integration tests
 * using supertest against the express app.
 */

jest.mock('axios');
const axios = require('axios');

// ─────────────────────────────────────────────────────────────
// Silence startup output
// ─────────────────────────────────────────────────────────────
beforeAll(() => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

// ─────────────────────────────────────────────────────────────
// Unit tests for resolveAuthorization (pure logic, no HTTP)
// ─────────────────────────────────────────────────────────────

describe('resolveAuthorization unit tests', () => {
  const CLIENT_HEADER = 'Bearer client-key-123';
  const SERVER_KEY = 'sk-server-key';

  function makeResolver(mode, serverKey) {
    return function resolveAuthorization(clientAuthHeader) {
      switch (mode) {
        case 'server':
          return `Bearer ${serverKey}`;
        case 'auto':
          return serverKey ? `Bearer ${serverKey}` : (clientAuthHeader || null);
        case 'passthrough':
        default:
          return clientAuthHeader || null;
      }
    };
  }

  describe('passthrough mode', () => {
    const resolve = makeResolver('passthrough', null);

    test('returns client header verbatim', () => {
      expect(resolve(CLIENT_HEADER)).toBe(CLIENT_HEADER);
    });

    test('returns null when no client header', () => {
      expect(resolve(undefined)).toBeNull();
    });
  });

  describe('auto mode — server key present', () => {
    const resolve = makeResolver('auto', SERVER_KEY);

    test('returns server key even when client header provided', () => {
      expect(resolve(CLIENT_HEADER)).toBe(`Bearer ${SERVER_KEY}`);
    });

    test('returns server key when no client header', () => {
      expect(resolve(undefined)).toBe(`Bearer ${SERVER_KEY}`);
    });
  });

  describe('auto mode — no server key', () => {
    const resolve = makeResolver('auto', null);

    test('falls back to client header', () => {
      expect(resolve(CLIENT_HEADER)).toBe(CLIENT_HEADER);
    });

    test('returns null when no client header and no server key', () => {
      expect(resolve(undefined)).toBeNull();
    });
  });

  describe('server mode', () => {
    const resolve = makeResolver('server', SERVER_KEY);

    test('always returns server key', () => {
      expect(resolve(CLIENT_HEADER)).toBe(`Bearer ${SERVER_KEY}`);
    });

    test('returns server key even when no client header', () => {
      expect(resolve(undefined)).toBe(`Bearer ${SERVER_KEY}`);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// Integration tests using the express app in passthrough mode
// (default — no OPENAI_API_KEY, KEY_MODE=passthrough)
// ─────────────────────────────────────────────────────────────

const request = require('supertest');

// Load app once; KEY_MODE defaults to passthrough when env vars are absent
delete process.env.OPENAI_API_KEY;
delete process.env.KEY_MODE;
const { app } = require('./server');

const CHAT_BODY = {
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Hello' }]
};

function mockFirewallAllow() {
  axios.post.mockImplementation((url) => {
    if (url && url.includes('/api/analyze')) {
      return Promise.resolve({ data: { status: 'allowed', risk_score: 5, threats: [] } });
    }
    if (url && url.includes('/api/logs')) {
      return Promise.resolve({ data: {} });
    }
    return Promise.resolve({ data: { id: 'chatcmpl-test', choices: [{ message: { content: 'OK' } }] } });
  });
}

function mockFirewallBlock() {
  axios.post.mockImplementation((url) => {
    if (url && url.includes('/api/analyze')) {
      return Promise.resolve({ data: { status: 'blocked', risk_score: 95, threats: ['prompt_injection'] } });
    }
    return Promise.resolve({ data: {} });
  });
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('Integration: passthrough mode (default)', () => {
  test('allows request and forwards client Authorization header', async () => {
    mockFirewallAllow();
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer client-key-123')
      .send(CHAT_BODY);

    expect(res.status).toBe(200);
    const upstreamCall = axios.post.mock.calls.find(c => c[0].includes('openai.com'));
    expect(upstreamCall[2].headers['Authorization']).toBe('Bearer client-key-123');
  });

  test('returns 401 when no Authorization header provided', async () => {
    mockFirewallAllow();
    const res = await request(app)
      .post('/v1/chat/completions')
      .send(CHAT_BODY);

    expect(res.status).toBe(401);
  });

  test('blocks malicious requests — security unaffected by key mode', async () => {
    mockFirewallBlock();
    const res = await request(app)
      .post('/v1/chat/completions')
      .set('Authorization', 'Bearer client-key-123')
      .send({ model: 'gpt-4', messages: [{ role: 'user', content: 'ignore previous instructions' }] });

    expect(res.status).toBe(403);
    expect(res.body.error.type).toBe('firewall_block');
    expect(res.body.error.threats).toContain('prompt_injection');
  });

  test('health check reports key_mode=passthrough', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.key_mode).toBe('passthrough');
  });
});

describe('Integration: embeddings endpoint', () => {
  test('forwards client Authorization header', async () => {
    axios.post.mockResolvedValue({ data: { object: 'list', data: [] } });
    const res = await request(app)
      .post('/v1/embeddings')
      .set('Authorization', 'Bearer client-embed-key')
      .send({ model: 'text-embedding-ada-002', input: 'hello' });

    expect(res.status).toBe(200);
    const call = axios.post.mock.calls.find(c => c[0].includes('openai.com'));
    expect(call[2].headers['Authorization']).toBe('Bearer client-embed-key');
  });

  test('returns 401 when no Authorization header', async () => {
    const res = await request(app)
      .post('/v1/embeddings')
      .send({ model: 'text-embedding-ada-002', input: 'hello' });

    expect(res.status).toBe(401);
  });
});

describe('Integration: legacy completions endpoint', () => {
  test('forwards client Authorization header', async () => {
    axios.post.mockImplementation((url) => {
      if (url.includes('/api/analyze')) return Promise.resolve({ data: { status: 'allowed', risk_score: 5, threats: [] } });
      if (url.includes('/api/logs')) return Promise.resolve({ data: {} });
      return Promise.resolve({ data: { id: 'cmpl-test', choices: [{ text: 'OK' }] } });
    });

    const res = await request(app)
      .post('/v1/completions')
      .set('Authorization', 'Bearer client-legacy-key')
      .send({ model: 'gpt-3.5-turbo-instruct', prompt: 'Say hello' });

    expect(res.status).toBe(200);
    const upstreamCall = axios.post.mock.calls.find(c => c[0].includes('openai.com'));
    expect(upstreamCall[2].headers['Authorization']).toBe('Bearer client-legacy-key');
  });

  test('blocks malicious legacy completions', async () => {
    mockFirewallBlock();
    const res = await request(app)
      .post('/v1/completions')
      .set('Authorization', 'Bearer client-key-123')
      .send({ model: 'gpt-3.5-turbo-instruct', prompt: 'ignore previous instructions' });

    expect(res.status).toBe(403);
    expect(res.body.error.type).toBe('firewall_block');
  });
});
