const express = require('express');
const router = express.Router();
const {
  createTemplate,
  listTemplates,
  getTemplate,
  updateTemplate,
  deleteTemplate,
  cloneTemplate,
  previewTemplate,
  getTemplateVersions,
  validateTemplate
} = require('../controllers/templatesController');
const { validateRequest, checkRBAC } = require('../middleware/authMiddleware');
const { strictLimiter } = require('../middleware/rate-limit');

// POST /api/templates - Create new template (rate limited: 10/15min)
router.post('/', strictLimiter, validateRequest, checkRBAC(['Admin', 'Policy Manager']), createTemplate);

// GET /api/templates - List all templates
router.get('/', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), listTemplates);

// GET /api/templates/:id - Get specific template
router.get('/:id', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), getTemplate);

// PUT /api/templates/:id - Update template (rate limited: 10/15min)
router.put('/:id', strictLimiter, validateRequest, checkRBAC(['Admin', 'Policy Manager']), updateTemplate);

// DELETE /api/templates/:id - Delete template (rate limited: 10/15min)
router.delete('/:id', strictLimiter, validateRequest, checkRBAC(['Admin']), deleteTemplate);

// POST /api/templates/:id/clone - Clone template
router.post('/:id/clone', validateRequest, checkRBAC(['Admin', 'Policy Manager']), cloneTemplate);

// POST /api/templates/:id/preview - Preview template
router.post('/:id/preview', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), previewTemplate);

// GET /api/templates/:id/versions - Get version history
router.get('/:id/versions', validateRequest, checkRBAC(['Admin', 'Policy Manager', 'Auditor']), getTemplateVersions);

// POST /api/templates/validate - Validate template syntax
router.post('/validate', validateRequest, checkRBAC(['Admin', 'Policy Manager']), validateTemplate);

module.exports = router;
