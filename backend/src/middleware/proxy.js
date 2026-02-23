const { normalizeInput } = require('../utils/inputNormalizer');

function handleProxyMiddleware(req, res, next) {
  try {
    // Pre-normalize the request payloads
    req.body = normalizeInput(req.body);
  } catch (e) {
    console.error('Error during input normalization:', e);
  }

  // Continue to the next middleware (policy evaluation, etc.)
  next();
}

module.exports = { handleProxyMiddleware };