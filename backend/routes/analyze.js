const express = require('express');
const router = express.Router();
const injectionDetector = require('../services/injectionDetector');

// POST /api/analyze-prompt
router.post('/analyze-prompt', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        const result = injectionDetector.analyzePrompt(prompt);
        return res.json(result);
    } catch (error) {
        console.error('Error analyzing prompt:', error);
        return res.status(500).json({ error: 'Failed to analyze prompt' });
    }
});

module.exports = router;