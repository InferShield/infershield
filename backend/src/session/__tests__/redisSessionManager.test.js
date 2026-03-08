/**
 * Redis Session Manager Tests
 * 
 * Comprehensive test suite for RedisSessionManager
 */

const RedisSessionManager = require('../redisSessionManager');

// Mock Redis for testing
jest.mock('../redisAdapter');
const RedisAdapter = require('../redisAdapter');

describe('RedisSessionManager', () => {
  let sessionManager;
  let mockRedis;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock Redis instance
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      expire: jest.fn(),
      scan: jest.fn(),
      ping: jest.fn(),
      isConnected: jest.fn(),
      close: jest.fn(),
      on: jest.fn(),
    };
    
    // Mock RedisAdapter constructor
    RedisAdapter.mockImplementation(() => mockRedis);
    
    sessionManager = new RedisSessionManager({
      defaultTTL: 1000,
      cleanupInterval: 0, // Disable cleanup interval for tests
      keyPrefix: 'test:session:',
    });
  });
  
  afterEach(async () => {
    if (sessionManager) {
      await sessionManager.cleanup();
    }
  });
  
  describe('createSession', () => {
    test('should create session with generated ID if not provided', async () => {
      mockRedis.set.mockResolvedValue(true);
      
      const sessionId = await sessionManager.createSession(null, { user: 'test' });
      
      expect(sessionId).toBeTruthy();
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('test:session:'),
        expect.objectContaining({
          sessionId,
          data: { user: 'test' },
          createdAt: expect.any(String),
          expiresAt: expect.any(String),
        }),
        expect.any(Number)
      );
    });
    
    test('should create session with provided ID', async () => {
      mockRedis.set.mockResolvedValue(true);
      
      await sessionManager.createSession('custom-id', { user: 'test' });
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:session:custom-id',
        expect.objectContaining({
          sessionId: 'custom-id',
          data: { user: 'test' },
        }),
        expect.any(Number)
      );
    });
    
    test('should calculate correct TTL in seconds', async () => {
      mockRedis.set.mockResolvedValue(true);
      
      await sessionManager.createSession('test-id', { user: 'test' });
      
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        1 // 1000ms / 1000 = 1 second
      );
    });
  });
  
  describe('getSession', () => {
    test('should return session data if found', async () => {
      const sessionData = {
        sessionId: 'test-id',
        data: { user: 'test', role: 'admin' },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      
      mockRedis.get.mockResolvedValue(sessionData);
      
      const result = await sessionManager.getSession('test-id');
      
      expect(result).toEqual({ user: 'test', role: 'admin' });
      expect(mockRedis.get).toHaveBeenCalledWith('test:session:test-id');
    });
    
    test('should return null if session not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await sessionManager.getSession('nonexistent');
      
      expect(result).toBeNull();
    });
    
    test('should return null if session is expired', async () => {
      const expiredSession = {
        sessionId: 'test-id',
        data: { user: 'test' },
        createdAt: new Date(Date.now() - 2000).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
      };
      
      mockRedis.get.mockResolvedValue(expiredSession);
      mockRedis.delete.mockResolvedValue(true);
      
      const result = await sessionManager.getSession('test-id');
      
      expect(result).toBeNull();
      expect(mockRedis.delete).toHaveBeenCalledWith('test:session:test-id');
    });
    
    test('should return null if sessionId is not provided', async () => {
      const result = await sessionManager.getSession(null);
      
      expect(result).toBeNull();
      expect(mockRedis.get).not.toHaveBeenCalled();
    });
  });
  
  describe('updateSession', () => {
    test('should update existing session', async () => {
      const existingSession = {
        sessionId: 'test-id',
        data: { user: 'test', count: 1 },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      
      mockRedis.get.mockResolvedValue(existingSession);
      mockRedis.set.mockResolvedValue(true);
      
      const result = await sessionManager.updateSession('test-id', { count: 2 });
      
      expect(result).toBe(true);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'test:session:test-id',
        expect.objectContaining({
          data: { user: 'test', count: 2 },
        }),
        expect.any(Number)
      );
    });
    
    test('should return false if session not found', async () => {
      mockRedis.get.mockResolvedValue(null);
      
      const result = await sessionManager.updateSession('nonexistent', { count: 2 });
      
      expect(result).toBe(false);
      expect(mockRedis.set).not.toHaveBeenCalled();
    });
  });
  
  describe('deleteSession', () => {
    test('should delete existing session', async () => {
      mockRedis.delete.mockResolvedValue(true);
      
      const result = await sessionManager.deleteSession('test-id');
      
      expect(result).toBe(true);
      expect(mockRedis.delete).toHaveBeenCalledWith('test:session:test-id');
    });
    
    test('should return false if session not found', async () => {
      mockRedis.delete.mockResolvedValue(false);
      
      const result = await sessionManager.deleteSession('nonexistent');
      
      expect(result).toBe(false);
    });
  });
  
  describe('extendSession', () => {
    test('should extend session TTL', async () => {
      const existingSession = {
        sessionId: 'test-id',
        data: { user: 'test' },
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      };
      
      mockRedis.expire.mockResolvedValue(true);
      mockRedis.get.mockResolvedValue(existingSession);
      mockRedis.set.mockResolvedValue(true);
      
      const result = await sessionManager.extendSession('test-id', 2000);
      
      expect(result).toBe(true);
      expect(mockRedis.expire).toHaveBeenCalledWith('test:session:test-id', 2);
    });
  });
  
  describe('getSessionCount', () => {
    test('should return correct session count', async () => {
      mockRedis.scan.mockResolvedValue([
        'test:session:id1',
        'test:session:id2',
        'test:session:id3',
      ]);
      
      const count = await sessionManager.getSessionCount();
      
      expect(count).toBe(3);
    });
  });
  
  describe('healthCheck', () => {
    test('should return true if Redis is healthy', async () => {
      mockRedis.ping.mockResolvedValue(true);
      
      const result = await sessionManager.healthCheck();
      
      expect(result).toBe(true);
    });
    
    test('should return false if Redis is unhealthy', async () => {
      mockRedis.ping.mockResolvedValue(false);
      
      const result = await sessionManager.healthCheck();
      
      expect(result).toBe(false);
    });
  });
  
  describe('isReady', () => {
    test('should return connection status', () => {
      mockRedis.isConnected.mockReturnValue(true);
      sessionManager.ready = true;
      
      const result = sessionManager.isReady();
      
      expect(result).toBe(true);
    });
  });
});
