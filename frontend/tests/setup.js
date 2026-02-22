// Jest setup
require('@testing-library/jest-dom');

// Mock fetch
global.fetch = jest.fn();

// Mock window.alert and window.confirm
global.alert = jest.fn();
global.confirm = jest.fn(() => true);

// Reset mocks after each test
afterEach(() => {
  jest.clearAllMocks();
});
