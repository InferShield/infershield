const express = require('express');
const router = express.Router();
const usageService = require('../services/usage-service');
const { authenticateJWT } = require('../middleware/auth');

// All routes require JWT authentication
router.use(authenticateJWT);

/**
 * GET /api/usage/current
 * Get current month usage summary
 */
router.get('/current', async (req, res) => {
  try {
    const usage = await usageService.getMonthlyUsage(req.userId);
    const quota = await usageService.checkQuota(req.userId, req.user.plan);

    res.json({
      success: true,
      usage,
      quota,
      plan: req.user.plan
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usage/daily
 * Get daily usage breakdown for current month
 */
router.get('/daily', async (req, res) => {
  try {
    const daily = await usageService.getDailyUsage(req.userId);

    res.json({
      success: true,
      daily
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usage/by-key
 * Get usage breakdown by API key
 */
router.get('/by-key', async (req, res) => {
  try {
    const byKey = await usageService.getUsageByKey(req.userId);

    res.json({
      success: true,
      byKey
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
