const cron = require('node-cron');
const reportsController = require('../controllers/reportsController');
const db = require('../db'); // Assuming a database module exists for querying

class ReportScheduler {
  constructor() {
    this.jobs = new Map();
  }

  async loadSchedules() {
    try {
      const schedules = await db.query('SELECT * FROM report_schedules WHERE active = true');
      schedules.forEach(schedule => {
        this.registerJob(schedule.id, schedule.cron_expression, schedule.filters);
      });
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
  }

  registerJob(id, cronExpression, filters) {
    if (this.jobs.has(id)) {
      this.unregisterJob(id);
    }

    try {
      const job = cron.schedule(cronExpression, async () => {
        try {
          await reportsController.generateReport(filters);
          console.log(`Report generated successfully for schedule ${id}`);
        } catch (error) {
          console.error(`Failed to generate report for schedule ${id}:`, error);
          // Implement retry logic here if necessary
        }
      });

      this.jobs.set(id, job);
      console.log(`Registered job for schedule ${id}`);
    } catch (error) {
      console.error(`Failed to register job for schedule ${id}:`, error);
    }
  }

  unregisterJob(id) {
    if (this.jobs.has(id)) {
      const job = this.jobs.get(id);
      job.stop();
      this.jobs.delete(id);
      console.log(`Unregistered job for schedule ${id}`);
    }
  }

  async addSchedule(id, cronExpression, filters) {
    try {
      await db.query('INSERT INTO report_schedules (id, cron_expression, filters, active) VALUES (?, ?, ?, true)', [id, cronExpression, JSON.stringify(filters)]);
      this.registerJob(id, cronExpression, filters);
    } catch (error) {
      console.error('Failed to add schedule:', error);
    }
  }

  async updateSchedule(id, cronExpression, filters) {
    try {
      await db.query('UPDATE report_schedules SET cron_expression = ?, filters = ? WHERE id = ?', [cronExpression, JSON.stringify(filters), id]);
      this.registerJob(id, cronExpression, filters);
    } catch (error) {
      console.error('Failed to update schedule:', error);
    }
  }

  async deleteSchedule(id) {
    try {
      await db.query('DELETE FROM report_schedules WHERE id = ?', [id]);
      this.unregisterJob(id);
    } catch (error) {
      console.error('Failed to delete schedule:', error);
    }
  }

  async toggleSchedule(id, enable) {
    try {
      await db.query('UPDATE report_schedules SET active = ? WHERE id = ?', [enable, id]);
      if (enable) {
        const schedule = await db.query('SELECT * FROM report_schedules WHERE id = ?', [id]);
        if (schedule.length) {
          const { cron_expression, filters } = schedule[0];
          this.registerJob(id, cron_expression, filters);
        }
      } else {
        this.unregisterJob(id);
      }
    } catch (error) {
      console.error(`Failed to ${enable ? 'enable' : 'disable'} schedule ${id}:`, error);
    }
  }
}

module.exports = new ReportScheduler();