const CacheService = require("../../services/cache-service");
const Redis = require("ioredis");
const mockFn = require("jest-mock");

jest.mock("ioredis");

const mockRedis = new Redis();

beforeEach(() => {
  jest.clearAllMocks();
});

test("CacheService.set stores a value with TTL", async () => {
  mockRedis.setex.mockResolvedValue("OK");

  await CacheService.set("test-key", "test-value", 100);

  expect(mockRedis.setex).toHaveBeenCalledWith("test-key", 100, "test-value");
});

test("CacheService.get retrieves a value", async () => {
  mockRedis.get.mockResolvedValue("test-value");

  const result = await CacheService.get("test-key");

  expect(mockRedis.get).toHaveBeenCalledWith("test-key");
  expect(result).toEqual("test-value");
});

test("CacheService.get gracefully handles errors", async () => {
  mockRedis.get.mockRejectedValue(new Error("Redis failure"));

  const result = await CacheService.get("test-key");

  expect(mockRedis.get).toHaveBeenCalledWith("test-key");
  expect(result).toBeNull();
});

test("CacheService.invalidate deletes matching keys", async () => {
  mockRedis.keys.mockResolvedValue(["test-key"]);
  mockRedis.del.mockResolvedValue(1);

  await CacheService.invalidate("test-key*");

  expect(mockRedis.keys).toHaveBeenCalledWith("test-key*");
  expect(mockRedis.del).toHaveBeenCalledWith(["test-key"]);
});