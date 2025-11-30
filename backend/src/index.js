// Use the new server.js for Phase 1 implementation
// This maintains backward compatibility
require('dotenv').config();
const app = require('./server');
const PORT = process.env.PORT || 4000;

if (!app || typeof app.listen !== 'function') {
  throw new Error('Backend server failed to initialize');
}

app.listen(PORT, () => {
  const logger = require('./workers/logger');
  logger.info('PRISM Backend started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    healthCheck: `http://localhost:${PORT}/health`
  });
});
