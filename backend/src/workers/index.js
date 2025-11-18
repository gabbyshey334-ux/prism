const { startBackgroundScheduler, shutdown } = require('./postWorker');
const logger = require('./logger');

// Graceful shutdown handling
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  await shutdown();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  shutdown().then(() => process.exit(1));
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  shutdown().then(() => process.exit(1));
});

// Start the background scheduler
async function startWorkers() {
  try {
    logger.info('Starting Prism background workers...');
    
    // Start the background scheduler
    startBackgroundScheduler();
    
    logger.info('Background workers started successfully');
    
    // Log worker status every 30 seconds
    setInterval(() => {
      logger.info('Workers are running', {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid
      });
    }, 30000);
    
  } catch (error) {
    logger.error('Failed to start workers:', error);
    process.exit(1);
  }
}

// Start workers if this file is run directly
if (require.main === module) {
  startWorkers();
}

module.exports = {
  startWorkers,
  shutdown
};