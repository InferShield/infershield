const auditLogger = require('../services/audit-logger');
const db = require('../db/db');

jest.mock('../db/db');

describe('AuditLogger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.query.mockResolvedValue({ rows: [] });
  });

  describe('log', () => {
    it('should insert audit log entry', async () => {
      await auditLogger.log({
        action: 'test.action',
        userId: 'user123',
        resourceType: 'report',
        resourceId: 'report456',
        ipAddress: '192.168.1.1',
        metadata: { test: 'data' },
        outcome: 'success'
      });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.arrayContaining(['test.action', 'user123', null, 'report', 'report456', '192.168.1.1', '{"test":"data"}', 'success'])
      );
    });

    it('should not throw on database error', async () => {
      db.query.mockRejectedValue(new Error('DB error'));

      await expect(auditLogger.log({
        action: 'test.action',
        resourceType: 'report',
        outcome: 'success'
      })).resolves.not.toThrow();
    });
  });

  describe('logReportGenerated', () => {
    it('should log report generation', async () => {
      await auditLogger.logReportGenerated(
        'user123',
        'report456',
        'SOC2_pdf',
        '192.168.1.1',
        { framework: 'SOC2' }
      );

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.arrayContaining(['report.generated', 'user123'])
      );

      const callArgs = db.query.mock.calls[0][1];
      const metadata = JSON.parse(callArgs[6]);
      expect(metadata.reportType).toBe('SOC2_pdf');
      expect(metadata.framework).toBe('SOC2');
    });
  });

  describe('logReportAccessed', () => {
    it('should log report access', async () => {
      await auditLogger.logReportAccessed('user123', 'report456', '192.168.1.1');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.arrayContaining(['report.accessed', 'user123', null, 'report', 'report456'])
      );
    });
  });

  describe('logReportDeleted', () => {
    it('should log report deletion', async () => {
      await auditLogger.logReportDeleted('user123', 'report456', '192.168.1.1', { reason: 'test' });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.arrayContaining(['report.deleted', 'user123', null, 'report', 'report456'])
      );
    });
  });

  describe('logAuthEvent', () => {
    it('should log successful login', async () => {
      await auditLogger.logAuthEvent('login', 'user123', '192.168.1.1', 'success');

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO security_audit_logs'),
        expect.arrayContaining(['auth.login', 'user123', null, 'auth', null, '192.168.1.1'])
      );
    });

    it('should log failed login', async () => {
      await auditLogger.logAuthEvent('login', 'user123', '192.168.1.1', 'failure', { reason: 'bad_password' });

      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[7]).toBe('failure');
    });
  });

  describe('logAccessDenied', () => {
    it('should log access denial', async () => {
      await auditLogger.logAccessDenied(
        'report.access_denied',
        'user123',
        'report',
        'report456',
        '192.168.1.1',
        'insufficient_permissions'
      );

      const callArgs = db.query.mock.calls[0][1];
      expect(callArgs[7]).toBe('failure');
      const metadata = JSON.parse(callArgs[6]);
      expect(metadata.reason).toBe('insufficient_permissions');
    });
  });

  describe('queryLogs', () => {
    it('should query all logs with limit', async () => {
      const mockLogs = [
        { id: 1, action: 'test.action', outcome: 'success' },
        { id: 2, action: 'test.action', outcome: 'failure' }
      ];
      db.query.mockResolvedValue({ rows: mockLogs });

      const result = await auditLogger.queryLogs({ limit: 100 });

      expect(result).toEqual(mockLogs);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM security_audit_logs'),
        [100]
      );
    });

    it('should filter by userId', async () => {
      await auditLogger.queryLogs({ userId: 'user123', limit: 50 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('user_id = $1'),
        ['user123', 50]
      );
    });

    it('should filter by action', async () => {
      await auditLogger.queryLogs({ action: 'report.generated', limit: 50 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('action = $1'),
        ['report.generated', 50]
      );
    });

    it('should filter by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await auditLogger.queryLogs({ startDate, endDate, limit: 50 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('timestamp >= $1'),
        [startDate, endDate, 50]
      );
    });
  });
});
