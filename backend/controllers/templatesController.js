const templateManager = require('../services/template-manager');
const auditLogger = require('../services/audit-logger');

/**
 * Templates controller
 * REST API for template management
 */

/**
 * POST /api/templates - Create new template
 */
exports.createTemplate = async (req, res) => {
  const { name, framework, templateType, content, metadata } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  try {
    // Validate template syntax
    const validation = templateManager.validateTemplate(content);
    if (!validation.valid) {
      return res.status(400).json({ error: `Invalid template: ${validation.error}` });
    }

    const template = await templateManager.create({
      name,
      framework,
      templateType,
      content,
      metadata,
      createdBy: userId
    });

    // Audit log
    await auditLogger.log({
      action: 'template.created',
      userId,
      resourceType: 'template',
      resourceId: template.id,
      ipAddress,
      metadata: { name, framework, templateType },
      outcome: 'success'
    });

    res.status(201).json(template);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/templates - List templates
 */
exports.listTemplates = async (req, res) => {
  const { framework, templateType, active } = req.query;

  try {
    const templates = await templateManager.list({
      framework,
      templateType,
      active: active !== 'false'
    });

    res.status(200).json(templates);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/templates/:id - Get template by ID
 */
exports.getTemplate = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  try {
    const template = await templateManager.getById(id);

    // Audit log
    await auditLogger.logTemplateAccessed(userId, id, ipAddress);

    res.status(200).json(template);
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * PUT /api/templates/:id - Update template
 */
exports.updateTemplate = async (req, res) => {
  const { id } = req.params;
  const { name, content, metadata } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  try {
    // Validate if content is being updated
    if (content) {
      const validation = templateManager.validateTemplate(content);
      if (!validation.valid) {
        return res.status(400).json({ error: `Invalid template: ${validation.error}` });
      }
    }

    const template = await templateManager.update(id, {
      name,
      content,
      metadata,
      updatedBy: userId
    });

    // Audit log
    await auditLogger.log({
      action: 'template.updated',
      userId,
      resourceType: 'template',
      resourceId: id,
      ipAddress,
      metadata: { name, version: template.version },
      outcome: 'success'
    });

    res.status(200).json(template);
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * DELETE /api/templates/:id - Delete template
 */
exports.deleteTemplate = async (req, res) => {
  const { id } = req.params;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  try {
    const deleted = await templateManager.delete(id, userId);

    if (!deleted) {
      await auditLogger.logAccessDenied(
        'template.delete_denied',
        userId,
        'template',
        id,
        ipAddress,
        'template_not_found'
      );
      return res.status(404).json({ error: 'Template not found' });
    }

    // Audit log
    await auditLogger.log({
      action: 'template.deleted',
      userId,
      resourceType: 'template',
      resourceId: id,
      ipAddress,
      outcome: 'success'
    });

    res.status(200).json({ message: 'Template deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/templates/:id/clone - Clone template
 */
exports.cloneTemplate = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const userId = req.user?.id;
  const ipAddress = req.ip;

  try {
    const cloned = await templateManager.clone(id, name, userId);

    // Audit log
    await auditLogger.log({
      action: 'template.cloned',
      userId,
      resourceType: 'template',
      resourceId: cloned.id,
      ipAddress,
      metadata: { sourceId: id, name: cloned.name },
      outcome: 'success'
    });

    res.status(201).json(cloned);
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/templates/:id/preview - Preview template with sample data
 */
exports.previewTemplate = async (req, res) => {
  const { id } = req.params;
  const { sampleData } = req.body;

  try {
    const html = await templateManager.preview(id, sampleData || {});
    res.status(200).json({ html });
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * GET /api/templates/:id/versions - Get template version history
 */
exports.getTemplateVersions = async (req, res) => {
  const { id } = req.params;

  try {
    const versions = await templateManager.getVersionHistory(id);
    res.status(200).json(versions);
  } catch (error) {
    if (error.message === 'Template not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message });
  }
};

/**
 * POST /api/templates/validate - Validate template syntax
 */
exports.validateTemplate = async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Template content is required' });
  }

  try {
    const validation = templateManager.validateTemplate(content);
    res.status(200).json(validation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
