const { startBackgroundScheduler, shutdown } = require('./postWorker');
const { contentQueue } = require('./contentWorker');
const { trendQueue } = require('./trendWorker');
const { postingQueue } = require('./postingWorker');
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
    
    // Start the background scheduler for posts
    startBackgroundScheduler();
    
    // Content generation queue is automatically started when imported
    logger.info('Content generation queue initialized');
    
    // Trend discovery queue is automatically started when imported
    logger.info('Trend discovery queue initialized');
    
    // Posting queue is automatically started when imported
    logger.info('Posting queue initialized');
    
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

// Graceful shutdown for content queue
async function shutdownContentQueue() {
  try {
    await contentQueue.close();
    logger.info('Content generation queue closed');
  } catch (error) {
    logger.error('Error closing content queue:', error);
  }
}

// Graceful shutdown for trend queue
async function shutdownTrendQueue() {
  try {
    await trendQueue.close();
    logger.info('Trend discovery queue closed');
  } catch (error) {
    logger.error('Error closing trend queue:', error);
  }
}

// Graceful shutdown for posting queue
async function shutdownPostingQueue() {
  try {
    await postingQueue.close();
    logger.info('Posting queue closed');
  } catch (error) {
    logger.error('Error closing posting queue:', error);
  }
}

// Enhanced shutdown
async function shutdownAll() {
  await shutdown();
  await shutdownContentQueue();
  await shutdownTrendQueue();
  await shutdownPostingQueue();
}

module.exports = {
  startWorkers,
  shutdown: shutdownAll
};