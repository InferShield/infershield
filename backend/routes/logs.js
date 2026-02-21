const express = require('express');
const router = express.Router();
const db = require('../database');

// POST /api/logs
router.post('/logs', async (req, res) => {
    const { prompt, response, metadata } = req.body;

    if (!prompt || !response) {
        return res.status(400).json({ error: 'Prompt and response are required' });
    }

    try {
        const result = await db.query(
            'INSERT INTO audit_logs (prompt, response, metadata) VALUES ($1, $2, $3) RETURNING *',
            [prompt, response, metadata || null]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error logging data:', error);
        return res.status(500).json({ error: 'Failed to log data' });
    }
});

// GET /api/logs
router.get('/logs', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM audit_logs ORDER BY created_at DESC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching logs:', error);
        return res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

module.exports = router;