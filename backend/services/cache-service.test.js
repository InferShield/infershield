const cacheService = require('../services/cache-service');

jest.mock('redis', () => {
  const mockClient = {
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    exists: jest.fn(),
    info: jest.fn(),
    dbsize: jest.fn(),
    quit: jest.fn(),
    on: jest.fn()
  };
  return {
    createClient: jest.fn(() => mockClient)
  };
});

describe('CacheService', () => {
  let mockClient;

  beforeEach(() => {
    const redis = require('redis');
    mockClient = redis.createClient();
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should get and parse cached value', async () => {
      const testData = { foo: 'bar' };
      mockClient.get.mockResolvedValue(JSON.stringify(testData));

      const result = await cacheService.get('test:key');

      expect(result).toEqual(testData);
      expect(mockClient.get).toHaveBeenCalledWith('test:key');
    });

    it('should return null for cache miss', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cacheService.get('missing:key');

      expect(result).toBeNull();
    });

    it('should return null on error', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheService.get('error:key');

      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      const testData = { foo: 'bar' };
      mockClient.setex.mockResolvedValue('OK');

      await cacheService.set('test:key', testData, 300);

      expect(mockClient.setex).toHaveBeenCalledWith(
        'test:key',
        300,
        JSON.stringify(testData)
      );
    });

    it('should use default TTL if not specified', async () => {
      const testData = { foo: 'bar' };
      mockClient.setex.mockResolvedValue('OK');

      await cacheService.set('test:key', testData);

      expect(mockClient.setex).toHaveBeenCalledWith(
        'test:key',
        3600, // default TTL
        JSON.stringify(testData)
      );
    });

    it('should not throw on error', async () => {
      mockClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(cacheService.set('error:key', {}, 300)).resolves.not.toThrow();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      mockClient.del.mockResolvedValue(1);

      await cacheService.del('test:key');

      expect(mockClient.del).toHaveBeenCalledWith('test:key');
    });
  });

  describe('delPattern', () => {
    it('should delete keys matching pattern', async () => {
      const keys = ['report:1', 'report:2', 'report:3'];
      mockClient.keys.mockResolvedValue(keys);
      mockClient.del.mockResolvedValue(3);

      const count = await cacheService.delPattern('report:*');

      expect(mockClient.keys).toHaveBeenCalledWith('report:*');
      expect(mockClient.del).toHaveBeenCalledWith(...keys);
      expect(count).toBe(3);
    });

    it('should return 0 when no keys match', async () => {
      mockClient.keys.mockResolvedValue([]);

      const count = await cacheService.delPattern('missing:*');

      expect(count).toBe(0);
      expect(mockClient.del).not.toHaveBeenCalled();
    });
  });

  describe('exists', () => {
    it('should return true if key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await cacheService.exists('test:key');

      expect(result).toBe(true);
    });

    it('should return false if key does not exist', async () => {
      mockClient.exists.mockResolvedValue(0);

      const result = await cacheService.exists('missing:key');

      expect(result).toBe(false);
    });
  });

  describe('getOrFetch', () => {
    it('should return cached value on hit', async () => {
      const testData = { foo: 'bar' };
      mockClient.get.mockResolvedValue(JSON.stringify(testData));

      const fetchFn = jest.fn();
      const result = await cacheService.getOrFetch('report123', fetchFn);

      expect(result).toEqual(testData);
      expect(fetchFn).not.toHaveBeenCalled();
      expect(mockClient.get).toHaveBeenCalledWith('report:report123');
    });

    it('should fetch and cache on miss', async () => {
      const testData = { foo: 'bar' };
      mockClient.get.mockResolvedValue(null);
      mockClient.setex.mockResolvedValue('OK');

      const fetchFn = jest.fn().mockResolvedValue(testData);
      const result = await cacheService.getOrFetch('report123', fetchFn, 600);

      expect(result).toEqual(testData);
      expect(fetchFn).toHaveBeenCalled();
      expect(mockClient.setex).toHaveBeenCalledWith(
        'report:report123',
        600,
        JSON.stringify(testData)
      );
    });
  });

  describe('cacheAggregation', () => {
    it('should cache aggregated data', async () => {
      const data = { totalEvents: 100 };
      mockClient.setex.mockResolvedValue('OK');

      await cacheService.cacheAggregation('SOC2', '30d', data, 86400);

      expect(mockClient.setex).toHaveBeenCalledWith(
        'aggregation:SOC2:30d',
        86400,
        JSON.stringify(data)
      );
    });
  });

  describe('getAggregation', () => {
    it('should get cached aggregation', async () => {
      const data = { totalEvents: 100 };
      mockClient.get.mockResolvedValue(JSON.stringify(data));

      const result = await cacheService.getAggregation('SOC2', '30d');

      expect(result).toEqual(data);
      expect(mockClient.get).toHaveBeenCalledWith('aggregation:SOC2:30d');
    });
  });

  describe('invalidateFramework', () => {
    it('should invalidate all caches for framework', async () => {
      const keys = ['aggregation:SOC2:7d', 'aggregation:SOC2:30d'];
      mockClient.keys.mockResolvedValue(keys);
      mockClient.del.mockResolvedValue(2);

      await cacheService.invalidateFramework('SOC2');

      expect(mockClient.keys).toHaveBeenCalledWith('aggregation:SOC2:*');
      expect(mockClient.del).toHaveBeenCalledWith(...keys);
    });
  });
});
