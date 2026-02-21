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

// Routes (imported as modules are created)
// app.use('/api/reports', require('./routes/reports'));
// app.use('/api/schedules', require('./routes/schedules'));
// app.use('/api/logs', require('./routes/logs'));

module.exports = app;
