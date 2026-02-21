const express = require('express');
const router = express.Router();
const { generateReport, getReports, getReportById, downloadReport, deleteReport } = require('../controllers/reportsController');
const { validateRequest, checkRBAC } = require('../middleware/authMiddleware');
const { reportLimiter, strictLimiter } = require('../middleware/rate-limit');

// POST /api/reports - Generate new report (rate limited: 3/hour)
router.post('/', reportLimiter, validateRequest, checkRBAC(['Admin', 'Policy Manager']), generateReport);

// GET /api/reports - List all reports
router.get('/', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), getReports);

// GET /api/reports/:id - Get specific report metadata
router.get('/:id', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), getReportById);

// GET /api/reports/:id/download - Download report file (rate limited: 10/15min)
router.get('/:id/download', strictLimiter, validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), downloadReport);

// DELETE /api/reports/:id - Delete report (rate limited: 10/15min)
router.delete('/:id', strictLimiter, validateRequest, checkRBAC(['Admin']), deleteReport);

const scheduleRoutes = require('./schedules');
router.use(scheduleRoutes);

module.exports = router;