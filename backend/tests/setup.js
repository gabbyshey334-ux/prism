// Test setup file
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = 'https://your-test-supabase-url.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'your-test-service-key';

// Mock console methods to reduce noise during tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};