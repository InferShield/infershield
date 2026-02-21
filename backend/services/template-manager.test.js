const templateManager = require('../services/template-manager');
const db = require('../db/db');

jest.mock('../db/db');

describe('TemplateManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create new template', async () => {
      const mockTemplate = {
        id: '123',
        name: 'SOC2 Template',
        framework: 'SOC2',
        template_type: 'pdf',
        content: '<h1>{{title}}</h1>',
        version: 1
      };

      db.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await templateManager.create({
        name: 'SOC2 Template',
        framework: 'SOC2',
        templateType: 'pdf',
        content: '<h1>{{title}}</h1>',
        createdBy: 'user123'
      });

      expect(result).toEqual(mockTemplate);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO report_templates'),
        expect.arrayContaining(['SOC2 Template', 'SOC2', 'pdf'])
      );
    });
  });

  describe('list', () => {
    it('should list all active templates', async () => {
      const mockTemplates = [
        { id: '1', name: 'Template 1' },
        { id: '2', name: 'Template 2' }
      ];

      db.query.mockResolvedValue({ rows: mockTemplates });

      const result = await templateManager.list();

      expect(result).toEqual(mockTemplates);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        []
      );
    });

    it('should filter by framework', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await templateManager.list({ framework: 'SOC2' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('framework = $1'),
        ['SOC2']
      );
    });

    it('should filter by templateType', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await templateManager.list({ templateType: 'pdf' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('template_type = $1'),
        ['pdf']
      );
    });
  });

  describe('getById', () => {
    it('should get template by ID', async () => {
      const mockTemplate = { id: '123', name: 'Test Template' };
      db.query.mockResolvedValue({ rows: [mockTemplate] });

      const result = await templateManager.getById('123');

      expect(result).toEqual(mockTemplate);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        ['123']
      );
    });

    it('should throw error if not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      await expect(templateManager.getById('999')).rejects.toThrow('Template not found');
    });
  });

  describe('update', () => {
    it('should update template and increment version', async () => {
      const existing = {
        id: '123',
        name: 'Old Name',
        content: 'old content',
        metadata: {},
        version: 1
      };

      const updated = {
        ...existing,
        name: 'New Name',
        version: 2
      };

      db.query
        .mockResolvedValueOnce({ rows: [existing] }) // getById
        .mockResolvedValueOnce({ rows: [updated] });  // update

      const result = await templateManager.update('123', {
        name: 'New Name',
        updatedBy: 'user123'
      });

      expect(result.version).toBe(2);
      expect(result.name).toBe('New Name');
    });
  });

  describe('delete', () => {
    it('should soft delete template', async () => {
      db.query.mockResolvedValue({ rows: [{ id: '123' }] });

      const result = await templateManager.delete('123', 'user123');

      expect(result).toBe(true);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = false'),
        ['user123', '123']
      );
    });

    it('should return false if template not found', async () => {
      db.query.mockResolvedValue({ rows: [] });

      const result = await templateManager.delete('999', 'user123');

      expect(result).toBe(false);
    });
  });

  describe('clone', () => {
    it('should clone template with new name', async () => {
      const existing = {
        id: '123',
        name: 'Original',
        framework: 'SOC2',
        template_type: 'pdf',
        content: 'content',
        metadata: {}
      };

      const cloned = {
        id: '456',
        name: 'Cloned Template',
        framework: 'SOC2',
        template_type: 'pdf',
        content: 'content',
        version: 1
      };

      db.query
        .mockResolvedValueOnce({ rows: [existing] })  // getById
        .mockResolvedValueOnce({ rows: [cloned] });   // create

      const result = await templateManager.clone('123', 'Cloned Template', 'user123');

      expect(result.id).toBe('456');
      expect(result.name).toBe('Cloned Template');
    });
  });

  describe('preview', () => {
    it('should render template with sample data', async () => {
      const template = {
        id: '123',
        content: '<h1>{{title}}</h1><p>{{description}}</p>'
      };

      db.query.mockResolvedValue({ rows: [template] });

      const html = await templateManager.preview('123', {
        title: 'Test Report',
        description: 'Sample data'
      });

      expect(html).toContain('<h1>Test Report</h1>');
      expect(html).toContain('<p>Sample data</p>');
    });

    it('should throw error on invalid template', async () => {
      const template = {
        id: '123',
        content: '{{unclosed tag'
      };

      db.query.mockResolvedValue({ rows: [template] });

      await expect(templateManager.preview('123', {})).rejects.toThrow('Template preview failed');
    });
  });

  describe('validateTemplate', () => {
    it('should validate correct template', () => {
      const result = templateManager.validateTemplate('<h1>{{title}}</h1>');

      expect(result.valid).toBe(true);
    });

    it('should reject invalid template', () => {
      const result = templateManager.validateTemplate('{{unclosed tag');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate complex templates', () => {
      const template = `
        <h1>{{title}}</h1>
        {{#each items}}
          <p>{{this.name}}</p>
        {{/each}}
      `;

      const result = templateManager.validateTemplate(template);

      expect(result.valid).toBe(true);
    });
  });
});
