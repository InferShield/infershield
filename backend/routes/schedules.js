const express = require('express');
const router = express.Router();
const reportScheduler = require('../services/report-scheduler');
const db = require('../db');

router.post('/api/schedules', async (req, res) => {
  const { id, cronExpression, filters } = req.body;

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    return res.status(400).json({ error: 'Invalid cron expression' });
  }

  try {
    await reportScheduler.addSchedule(id, cronExpression, filters);
    res.status(201).json({ message: 'Schedule created successfully' });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ error: 'Failed to create schedule' });
  }
});

router.get('/api/schedules', async (req, res) => {
  try {
    const schedules = await db.query('SELECT * FROM report_schedules');
    res.status(200).json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

router.get('/api/schedules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const schedule = await db.query('SELECT * FROM report_schedules WHERE id = ?', [id]);
    if (schedule.length === 0) {
      return res.status(404).json({ error: 'Schedule not found' });
    }
    res.status(200).json(schedule[0]);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
});

router.put('/api/schedules/:id', async (req, res) => {
  const { id } = req.params;
  const { cronExpression, filters } = req.body;

  // Validate cron expression
  if (!cron.validate(cronExpression)) {
    return res.status(400).json({ error: 'Invalid cron expression' });
  }

  try {
    await reportScheduler.updateSchedule(id, cronExpression, filters);
    res.status(200).json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

router.delete('/api/schedules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await reportScheduler.deleteSchedule(id);
    res.status(200).json({ message: 'Schedule deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});

module.exports = router;