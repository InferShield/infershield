const db = require('../db/db');

/**
 * Template manager for compliance report templates
 * Provides CRUD operations, versioning, and preview
 */
class TemplateManager {
  /**
   * Create a new template
   * @param {Object} template - Template data
   * @returns {Promise<Object>} - Created template with ID
   */
  async create(template) {
    const {
      name,
      framework,
      templateType,
      content,
      metadata = {},
      createdBy
    } = template;

    const result = await db.query(
      `INSERT INTO report_templates 
       (name, framework, template_type, content, metadata, version, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 1, $6, NOW(), NOW())
       RETURNING *`,
      [name, framework, templateType, content, JSON.stringify(metadata), createdBy]
    );

    return result.rows[0];
  }

  /**
   * Get all templates
   * @param {Object} filters - Optional filters (framework, templateType)
   * @returns {Promise<Array>} - List of templates
   */
  async list(filters = {}) {
    const { framework, templateType, active = true } = filters;

    let query = 'SELECT * FROM report_templates WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (framework) {
      query += ` AND framework = $${paramIndex}`;
      params.push(framework);
      paramIndex++;
    }

    if (templateType) {
      query += ` AND template_type = $${paramIndex}`;
      params.push(templateType);
      paramIndex++;
    }

    if (active) {
      query += ` AND is_active = true`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get template by ID
   * @param {string} id - Template ID
   * @returns {Promise<Object>} - Template data
   */
  async getById(id) {
    const result = await db.query(
      'SELECT * FROM report_templates WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      throw new Error('Template not found');
    }

    return result.rows[0];
  }

  /**
   * Update template (creates new version)
   * @param {string} id - Template ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} - Updated template
   */
  async update(id, updates) {
    const existing = await this.getById(id);
    const {
      name = existing.name,
      content = existing.content,
      metadata = existing.metadata,
      updatedBy
    } = updates;

    const newVersion = existing.version + 1;

    const result = await db.query(
      `UPDATE report_templates 
       SET name = $1, content = $2, metadata = $3, version = $4, updated_at = NOW(), updated_by = $5
       WHERE id = $6
       RETURNING *`,
      [name, content, JSON.stringify(metadata), newVersion, updatedBy, id]
    );

    return result.rows[0];
  }

  /**
   * Delete template (soft delete - mark as inactive)
   * @param {string} id - Template ID
   * @param {string} deletedBy - User ID who deleted
   * @returns {Promise<boolean>}
   */
  async delete(id, deletedBy) {
    const result = await db.query(
      `UPDATE report_templates 
       SET is_active = false, updated_at = NOW(), updated_by = $1
       WHERE id = $2
       RETURNING id`,
      [deletedBy, id]
    );

    return result.rows.length > 0;
  }

  /**
   * Get template version history
   * @param {string} id - Template ID
   * @returns {Promise<Array>} - Version history
   */
  async getVersionHistory(id) {
    // For now, return current version only
    // In production, this would query a template_versions table
    const template = await this.getById(id);
    return [{
      version: template.version,
      updated_at: template.updated_at,
      updated_by: template.updated_by
    }];
  }

  /**
   * Clone template (create copy)
   * @param {string} id - Template ID to clone
   * @param {string} newName - Name for cloned template
   * @param {string} clonedBy - User ID who cloned
   * @returns {Promise<Object>} - Cloned template
   */
  async clone(id, newName, clonedBy) {
    const existing = await this.getById(id);

    return await this.create({
      name: newName || `${existing.name} (Copy)`,
      framework: existing.framework,
      templateType: existing.template_type,
      content: existing.content,
      metadata: existing.metadata,
      createdBy: clonedBy
    });
  }

  /**
   * Preview template with sample data
   * @param {string} id - Template ID
   * @param {Object} sampleData - Sample data for preview
   * @returns {Promise<string>} - Rendered HTML preview
   */
  async preview(id, sampleData = {}) {
    const template = await this.getById(id);
    const Handlebars = require('handlebars');

    try {
      const compiledTemplate = Handlebars.compile(template.content);
      const html = compiledTemplate(sampleData);
      return html;
    } catch (error) {
      throw new Error(`Template preview failed: ${error.message}`);
    }
  }

  /**
   * Validate template syntax
   * @param {string} content - Template content (Handlebars)
   * @returns {Object} - Validation result
   */
  validateTemplate(content) {
    const Handlebars = require('handlebars');

    try {
      Handlebars.compile(content);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
}

module.exports = new TemplateManager();
