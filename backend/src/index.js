require('dotenv').config();
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
const originsEnv = process.env.FRONTEND_URLS || process.env.FRONTEND_URL || ''
const allowedOrigins = originsEnv.split(',').map(s => s.trim()).filter(Boolean)
app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin) return callback(null, true)
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true)
    }
    return callback(new Error('Not allowed by CORS'))
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

// Root route for service status
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'prism-backend', base: '/api' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'prism-backend' });
});

// Mount routers
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

app.listen(PORT, () => {
  console.log(`✅ Backend listening on http://localhost:${PORT}`);
});
