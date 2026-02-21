const express = require('express');
const router = express.Router();
const db = require('../database');
const policyEngine = require('../services/policyEngine');

// POST /api/policies
router.post('/policies', async (req, res) => {
    const { name, rule } = req.body;

    if (!name || !rule) {
        return res.status(400).json({ error: 'Policy name and rule are required' });
    }

    try {
        const result = await db.query(
            'INSERT INTO policies (name, rule) VALUES ($1, $2) RETURNING *',
            [name, rule]
        );
        return res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creating policy:', error);
        return res.status(500).json({ error: 'Failed to create policy' });
    }
});

// GET /api/policies
router.get('/policies', async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM policies ORDER BY created_at DESC');
        return res.json(result.rows);
    } catch (error) {
        console.error('Error fetching policies:', error);
        return res.status(500).json({ error: 'Failed to fetch policies' });
    }
});

// POST /api/enforce
router.post('/enforce', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const policies = await db.query('SELECT * FROM policies');
        const enforcement = policyEngine.enforcePolicies(prompt, policies.rows);
        return res.json(enforcement);
    } catch (error) {
        console.error('Error enforcing policies:', error);
        return res.status(500).json({ error: 'Failed to enforce policies' });
    }
});

module.exports = router;