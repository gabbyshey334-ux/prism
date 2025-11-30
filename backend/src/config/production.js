const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
let RedisStore;
try {
  RedisStore = require('rate-limit-redis');
} catch (_) {
  RedisStore = null;
}
const Redis = require('redis');
const session = require('express-session');
const RedisStoreSession = require('connect-redis')(session);
const logger = require('../workers/logger');

// Production security configuration
const configureProductionSecurity = (app) => {
  // Trust proxy for accurate IP detection behind load balancers
  app.set('trust proxy', 1);

  // Comprehensive security headers with Helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'", "https://api.prism-app.com"],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"]
      }
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'same-origin' }
  }));

  // Remove powered-by header
  app.disable('x-powered-by');

  // Rate limiting configuration
  const redisClient = Redis.createClient({
    host: process.env.REDIS_HOST || 'redis',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
  });

  // General API rate limiter
  const generalLimiter = rateLimit({
    store: RedisStore ? new RedisStore({ client: redisClient, prefix: 'rl:general:' }) : undefined,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
      error: 'Too many requests from this IP',
      retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        url: req.originalUrl,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many requests from this IP',
        retryAfter: '15 minutes'
      });
    }
  });

  // Strict rate limiter for auth endpoints
  const authLimiter = rateLimit({
    store: RedisStore ? new RedisStore({ client: redisClient, prefix: 'rl:auth:' }) : undefined,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs
    skipSuccessfulRequests: true,
    handler: (req, res) => {
      logger.warn('Auth rate limit exceeded', {
        ip: req.ip,
        email: req.body.email,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Too many authentication attempts',
        retryAfter: '15 minutes'
      });
    }
  });

  // Social posting rate limiter (per brand)
  const socialPostingLimiter = rateLimit({
    store: RedisStore ? new RedisStore({ client: redisClient, prefix: 'rl:social:' }) : undefined,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // limit each brand to 50 posts per hour
    keyGenerator: (req) => {
      return req.user?.brand_id || req.ip;
    },
    handler: (req, res) => {
      logger.warn('Social posting rate limit exceeded', {
        brandId: req.user?.brand_id,
        ip: req.ip,
        userAgent: req.get('User-Agent')
      });
      res.status(429).json({
        error: 'Brand posting rate limit exceeded',
        retryAfter: '1 hour'
      });
    }
  });

  // Apply rate limiters
  app.use('/api/auth', authLimiter);
  app.use('/api/social', socialPostingLimiter);
  app.use('/api', generalLimiter);

  // Session configuration with Redis
  const sessionStore = new RedisStoreSession({
    client: redisClient,
    prefix: 'sess:',
    ttl: 86400 // 24 hours
  });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    name: 'sessionId',
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict'
    }
  }));

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      
      // Log slow requests (> 1 second)
      if (duration > 1000) {
        logger.warn('Slow request detected', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`,
          ip: req.ip,
          userAgent: req.get('User-Agent')
        });
      }

      // Log all requests in debug mode
      if (process.env.NODE_ENV === 'development') {
        logger.debug('Request completed', {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration: `${duration}ms`
        });
      }
    });

    next();
  });

  // Error handling middleware
  app.use((error, req, res, next) => {
    logger.error('Unhandled error', {
      error: error.message,
      stack: error.stack,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip
    });

    // Don't leak error details in production
    if (process.env.NODE_ENV === 'production') {
      res.status(500).json({
        error: 'Internal server error',
        requestId: req.id
      });
    } else {
      res.status(500).json({
        error: error.message,
        stack: error.stack
      });
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.npm_package_version
    });
  });

  // Security headers endpoint
  app.get('/security-headers', (req, res) => {
    res.json({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'same-origin',
      'Content-Security-Policy': "default-src 'self'",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
    });
  });

  logger.info('Production security configuration applied');
};

module.exports = {
  configureProductionSecurity
};
