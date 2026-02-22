const authService = require('../services/auth-service');
const apiKeyService = require('../services/api-key-service');

/**
 * JWT Authentication Middleware
 * Validates Bearer token and attaches user to request
 */
async function authenticateJWT(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '
    const payload = authService.verifyToken(token);

    // Get full user object
    const user = await authService.getUserById(payload.userId);

    // Attach to request
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Unauthorized' });
  }
}

/**
 * API Key Authentication Middleware
 * Validates API key (isk_live_* or isk_test_*)
 */
async function authenticateAPIKey(req, res, next) {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.api_key;

    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key. Provide via X-API-Key header or api_key query param.' });
    }

    // Validate key
    const { apiKey: keyRecord, user } = await apiKeyService.validateKey(apiKey);

    // Attach to request
    req.apiKey = keyRecord;
    req.user = user;
    req.userId = user.id;

    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid API key' });
  }
}

/**
 * Optional Authentication Middleware
 * Allows both authenticated and unauthenticated access
 * Attaches user if present
 */
async function optionalAuth(req, res, next) {
  try {
    // Try API key first
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    if (apiKey) {
      const { apiKey: keyRecord, user } = await apiKeyService.validateKey(apiKey);
      req.apiKey = keyRecord;
      req.user = user;
      req.userId = user.id;
      return next();
    }

    // Try JWT
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = authService.verifyToken(token);
      const user = await authService.getUserById(payload.userId);
      req.user = user;
      req.userId = user.id;
      return next();
    }

    // No auth provided, continue without user
    next();
  } catch (error) {
    // Ignore auth errors in optional mode
    next();
  }
}

module.exports = {
  authenticateJWT,
  authenticateAPIKey,
  optionalAuth
};
