require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
console.log('Starting prism-backend');
const originsEnv = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || ''
const defaultOrigins = [
  'https://prism-five-livid.vercel.app',
  'https://prism-app.com',
  'http://localhost:3000'
];
const envOrigins = originsEnv.split(',').map(s => s.trim()).filter(Boolean);
const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;
console.log('Allowed CORS origins:', allowedOrigins);
app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json());
app.use(session({ 
  secret: process.env.JWT_SECRET, 
  resave: false, 
  saveUninitialized: false 
}));
app.use(passport.initialize());
app.use(passport.session());

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'prism-backend', base: '/api' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'prism-backend' });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'prism-backend' });
});

try {
  console.log('Mounting routers');
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/social', require('./routes/social'));
  app.use('/api/social', require('./routes/social_posting'));
  app.use('/api/oauth', require('./routes/oauth'));
  app.use('/api/brands', require('./routes/brands'));
  app.use('/api/connections', require('./routes/connections'));
  app.use('/api/content', require('./routes/content'));
  app.use('/api/brand_settings', require('./routes/brand_settings'));
  app.use('/api/autolist_settings', require('./routes/autolist_settings'));
  app.use('/api/trending_topics', require('./routes/trending_topics'));
  app.use('/api/templates', require('./routes/templates'));
  app.use('/api/uploads', require('./routes/uploads'));
  app.use('/api/integrations', require('./routes/integrations'));
  app.use('/auth', require('./routes/auth'));
  app.use('/social', require('./routes/social'));
  app.use('/social', require('./routes/social_posting'));
  app.use('/oauth', require('./routes/oauth'));
  app.use('/brands', require('./routes/brands'));
  app.use('/connections', require('./routes/connections'));
  app.use('/content', require('./routes/content'));
  app.use('/brand_settings', require('./routes/brand_settings'));
  app.use('/autolist_settings', require('./routes/autolist_settings'));
  app.use('/trending_topics', require('./routes/trending_topics'));
  app.use('/templates', require('./routes/templates'));
  app.use('/uploads', require('./routes/uploads'));
  app.use('/integrations', require('./routes/integrations'));
  console.log('Routers mounted');
} catch (e) {
  console.error('Router mount error:', e);
}

app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});
