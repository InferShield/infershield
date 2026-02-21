const request = require('supertest');
const app = require('../app'); // Assuming an Express app is already set up
const reportScheduler = require('../services/report-scheduler');

jest.mock('../db', () => ({
  query: jest.fn()
}));
const db = require('../db');

describe('Report Scheduler API', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error during tests
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('POST /api/schedules - creates a new schedule', async () => {
    db.query.mockResolvedValueOnce();
    const newSchedule = {
      id: 'test-schedule-1',
      cronExpression: '0 0 * * *',
      filters: { key: 'value' }
    };

    const response = await request(app).post('/api/schedules').send(newSchedule);

    expect(response.statusCode).toBe(201);
    expect(response.body.message).toBe('Schedule created successfully');
    expect(db.query).toHaveBeenCalledWith(
      'INSERT INTO report_schedules (id, cron_expression, filters, active) VALUES (?, ?, ?, true)',
      [newSchedule.id, newSchedule.cronExpression, JSON.stringify(newSchedule.filters)]
    );
  });

  test('POST /api/schedules - rejects invalid cron expression', async () => {
    const invalidSchedule = {
      id: 'test-schedule-2',
      cronExpression: 'invalid-cron',
      filters: { key: 'value' }
    };

    const response = await request(app).post('/api/schedules').send(invalidSchedule);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toBe('Invalid cron expression');
    expect(db.query).not.toHaveBeenCalled();
  });

  test('GET /api/schedules - retrieves all schedules', async () => {
    const mockSchedules = [
      { id: 'schedule-1', cron_expression: '0 0 * * *', filters: '{"key":"value"}' }
    ];
    db.query.mockResolvedValueOnce(mockSchedules);

    const response = await request(app).get('/api/schedules');

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(mockSchedules);
    expect(db.query).toHaveBeenCalledWith('SELECT * FROM report_schedules');
  });

  test('DELETE /api/schedules/:id - deletes a schedule', async () => {
    db.query.mockResolvedValueOnce();

    const response = await request(app).delete('/api/schedules/schedule-1');

    expect(response.statusCode).toBe(200);
    expect(response.body.message).toBe('Schedule deleted successfully');
    expect(db.query).toHaveBeenCalledWith('DELETE FROM report_schedules WHERE id = ?', ['schedule-1']);
  });
});