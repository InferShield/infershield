const express = require('express');
const router = express.Router();
const authService = require('../services/auth-service');
const { authenticateJWT } = require('../middleware/auth');

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, company } = req.body;

    const user = await authService.register({ email, password, name, company });

    res.status(201).json({
      success: true,
      user,
      message: 'Account created successfully. Please verify your email.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    const { user, token } = await authService.login({ email, password, ip });

    res.json({
      success: true,
      user,
      token,
      message: 'Logged in successfully'
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', authenticateJWT, async (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

/**
 * PUT /api/auth/me
 * Update current user
 */
router.put('/me', authenticateJWT, async (req, res) => {
  try {
    const { name, company } = req.body;
    
    // TENANT-SCOPED: req.userId comes from JWT, ensures user can only update their own profile
    const user = await authService.updateUser(req.userId, { name, company });

    res.json({
      success: true,
      user,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateJWT, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
