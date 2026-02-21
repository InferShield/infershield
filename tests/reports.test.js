const request = require('supertest');
const app = require('../app'); // Assuming app.js initializes the express app

describe('Reports API', () => {
    describe('POST /api/reports', () => {
        it('should generate a new report', async () => {
            const response = await request(app)
                .post('/api/reports')
                .send({ framework: 'ISO27001', startDate: '2023-01-01', endDate: '2023-01-31', format: 'PDF', templateType: 'standard' })
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body).toHaveProperty('reportId');
            expect(response.body).toHaveProperty('status', 'Generated');
        });
    });

    describe('GET /api/reports', () => {
        it('should list all reports', async () => {
            const response = await request(app)
                .get('/api/reports?page=1&limit=10')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
        });
    });

    describe('GET /api/reports/:id', () => {
        it('should retrieve specific report metadata', async () => {
            const reportId = 1; // Use a valid report ID during the test
            const response = await request(app)
                .get(`/api/reports/${reportId}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('id', reportId);
        });
    });

    describe('GET /api/reports/:id/download', () => {
        it('should download the report file', async () => {
            const reportId = 1; // Use a valid report ID with a file
            const response = await request(app)
                .get(`/api/reports/${reportId}/download`)
                .expect(200);

            expect(response.header['content-disposition']).toMatch(/attachment/);
        });
    });

    describe('DELETE /api/reports/:id', () => {
        it('should delete the report', async () => {
            const reportId = 1; // Use a valid report ID
            await request(app)
                .delete(`/api/reports/${reportId}`)
                .expect(200);
        });
    });
});