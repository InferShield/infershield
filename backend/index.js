const express = require('express');
const app = express();
const cors = require('cors');
const morgan = require('morgan');
const { Pool } = require('pg');
const redis = require('redis');

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// PostgreSQL setup
const pool = new Pool({
    user: 'postgres', // Replace with actual username
    host: 'localhost',
    database: 'agentic_firewall',
    password: 'password', // Replace with actual password
    port: 5432,
});

// Redis setup
const redisClient = redis.createClient(); // Default is localhost:6379
redisClient.on('error', (error) => console.error(`Redis error: ${error}`));

// Basic route
app.get('/', (req, res) => {
    res.send('Agentic Firewall Backend is running');
});

// API Routes placeholder
app.use('/api', require('./routes'));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});