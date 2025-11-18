const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5,
  silly: 6
};

// Create the logger
const logger = winston.createLogger({
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'prism-backend' },
  transports: [
    // Error log file
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined log file
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // HTTP log file
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    }),
  ],
  
  // Handle exceptions
  exceptionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'exceptions.log') })
  ],
  
  // Handle rejections
  rejectionHandlers: [
    new winston.transports.File({ filename: path.join(logsDir, 'rejections.log') })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
    level: 'debug'
  }));
}

// Add console transport in production with minimal logging
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    level: 'info'
  }));
}

// Create a stream object for Morgan HTTP logging
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// Helper function to create structured logs
logger.logRequest = (req, res, responseTime) => {
  const logData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    responseTime: responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    userId: req.user?.id || null,
    requestId: req.id || null,
    contentLength: res.get('Content-Length') || 0,
  };
  
  logger.http('HTTP Request', logData);
};

// Helper function to log errors
logger.logError = (error, context = {}) => {
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    code: error.code,
    ...context
  };
  
  logger.error('Application Error', errorData);
};

// Helper function to log database operations
logger.logDatabase = (operation, table, details = {}) => {
  logger.debug('Database Operation', {
    operation,
    table,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Helper function to log queue operations
logger.logQueue = (queueName, action, jobId, details = {}) => {
  logger.info('Queue Operation', {
    queue: queueName,
    action,
    jobId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Helper function to log security events
logger.logSecurity = (event, userId, details = {}) => {
  logger.warn('Security Event', {
    event,
    userId,
    ...details,
    timestamp: new Date().toISOString()
  });
};

// Helper function to log performance metrics
logger.logPerformance = (metric, value, unit = 'ms', tags = {}) => {
  logger.debug('Performance Metric', {
    metric,
    value,
    unit,
    tags,
    timestamp: new Date().toISOString()
  });
};

module.exports = logger;