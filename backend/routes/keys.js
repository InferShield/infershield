const express = require('express');
const router = express.Router();
const apiKeyService = require('../services/api-key-service');
const { authenticateJWT } = require('../middleware/auth');

// All routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /api/keys
 * List all API keys for current user
 */
router.get('/', async (req, res) => {
  try {
    const keys = await apiKeyService.listKeys(req.userId);

    res.json({
      success: true,
      keys
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/keys
 * Create a new API key
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, environment, expiresIn } = req.body;

    const key = await apiKeyService.createKey(req.userId, {
      name,
      description,
      environment,
      expiresIn
    });

    res.status(201).json({
      success: true,
      key,
      message: 'API key created successfully. Save it now - it won\'t be shown again!'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/keys/:id
 * Get API key details (without the actual key)
 */
router.get('/:id', async (req, res) => {
  try {
    const key = await apiKeyService.getKey(req.params.id, req.userId);

    res.json({
      success: true,
      key
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/keys/:id
 * Revoke an API key
 */
router.delete('/:id', async (req, res) => {
  try {
    const { reason } = req.body;

    await apiKeyService.revokeKey(req.params.id, req.userId, reason);

    res.json({
      success: true,
      message: 'API key revoked successfully'
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
