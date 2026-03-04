const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes - mount key management and related endpoints for testing
try {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/keys', require('./routes/keys'));
  app.use('/api/usage', require('./routes/usage'));
} catch (error) {
  console.error('Error loading routes:', error.message);
}

module.exports = app;
