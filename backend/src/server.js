require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
const { getRedisClient } = require('./config/redis');
const logger = require('./workers/logger');

const app = express();
const PORT = process.env.PORT || 4000;

// Trust proxy for accurate IP detection behind load balancers
app.set('trust proxy', 1);

// Security middleware - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "*"],
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

// CORS configuration
const originsEnv = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || '';
const defaultOrigins = [
  'https://prism-five-livid.vercel.app',
  'https://prism-app.com',
  'http://localhost:3000',
  'http://localhost:5173'
];
const envOrigins = originsEnv.split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

logger.info('CORS configuration', { allowedOrigins });

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    logger.warn('CORS blocked origin', { origin, allowedOrigins });
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
  maxAge: 86400 // 24 hours
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_KEY',
    'SESSION_SECRET'
  ];
  
  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    logger.error('Missing required environment variables', { missing });
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Session configuration with Redis
let sessionStore = null;
if (process.env.REDIS_HOST) {
  try {
    const RedisStore = require('connect-redis').default;
    const redisClient = getRedisClient();
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'sess:',
      ttl: 86400 // 24 hours
    });
    logger.info('Redis session store configured');
  } catch (e) {
    logger.warn('Redis session store failed, using memory store', { error: e.message });
  }
}

// Validate session secret
const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!sessionSecret) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET or JWT_SECRET must be set in production');
  }
  logger.warn('Using fallback session secret - not suitable for production');
  // Only allow fallback in development
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('SESSION_SECRET or JWT_SECRET must be set');
  }
}

app.use(session({
  store: sessionStore || undefined,
  secret: sessionSecret || (process.env.NODE_ENV === 'development' ? 'dev-secret-change-in-production' : undefined),
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Global CORS fallback middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && (allowedOrigins.length === 0 || allowedOrigins.includes(origin))) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Headers', 'Accept,Authorization,Cache-Control,Content-Type,DNT,If-Modified-Since,Keep-Alive,Origin,User-Agent,X-Requested-With');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }
  }
  next();
});

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

    // Log all requests in development
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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'prism-backend',
    version: '1.0.0',
    base: '/api',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoints
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'prism-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Check Redis connection
  if (process.env.REDIS_HOST) {
    try {
      const redisClient = getRedisClient();
      await redisClient.ping();
      health.redis = 'connected';
    } catch (e) {
      health.redis = 'disconnected';
      health.status = 'degraded';
    }
  }

  // Check Supabase connection
  if (process.env.SUPABASE_URL) {
    try {
      const { supabaseAdmin } = require('./config/supabase');
      const { error } = await supabaseAdmin.from('brands').select('id').limit(1);
      if (error) throw error;
      health.supabase = 'connected';
    } catch (e) {
      health.supabase = 'disconnected';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    service: 'prism-backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  };

  // Check Redis connection
  if (process.env.REDIS_HOST) {
    try {
      const redisClient = getRedisClient();
      await redisClient.ping();
      health.redis = 'connected';
    } catch (e) {
      health.redis = 'disconnected';
      health.status = 'degraded';
    }
  }

  // Check Supabase connection
  if (process.env.SUPABASE_URL) {
    try {
      const { supabaseAdmin } = require('./config/supabase');
      const { error } = await supabaseAdmin.from('brands').select('id').limit(1);
      if (error) throw error;
      health.supabase = 'connected';
    } catch (e) {
      health.supabase = 'disconnected';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Mount API routes
try {
  logger.info('Mounting API routes...');
  
  // Phase 1: OAuth routes (new implementation)
  app.use('/api/oauth', require('./routes/oauth-v2'));
  
  // Legacy routes (maintain backward compatibility)
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/brands', require('./routes/brands'));
  app.use('/api/connections', require('./routes/connections'));
  app.use('/api/content', require('./routes/content'));
  app.use('/api/brand_settings', require('./routes/brand_settings'));
  app.use('/api/autolist_settings', require('./routes/autolist_settings'));
  app.use('/api/trending_topics', require('./routes/trending_topics'));
  app.use('/api/templates', require('./routes/templates'));
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/integrations', require('./routes/integrations'));
  app.use('/api/functions', require('./routes/functions'));
  app.use('/api/social', require('./routes/social'));
  app.use('/api/social', require('./routes/social_posting'));
  app.use('/api/trends', require('./routes/trends'));
  app.use('/api/cesdk', require('./routes/cesdk'));
  app.use('/api/posts', require('./routes/posting'));
  app.use('/api/webhooks', require('./routes/webhooks'));
  
  // Legacy OAuth route (for backward compatibility)
  app.use('/api/oauth-legacy', require('./routes/oauth'));
  
  logger.info('All routes mounted successfully');
} catch (e) {
  logger.error('Router mount error', { error: e.message, stack: e.stack });
  process.exit(1);
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    logger.info('PRISM Backend started', {
      port: PORT,
      environment: process.env.NODE_ENV || 'development',
      healthCheck: `http://localhost:${PORT}/health`
    });
  });
}

module.exports = app;

