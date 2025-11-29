// Use the new server.js for Phase 1 implementation
// This maintains backward compatibility
require('dotenv').config();
const app = require('./server');
const PORT = process.env.PORT || 4000;

// Server is now configured in server.js
// Routes are mounted in server.js
// This file maintains backward compatibility
