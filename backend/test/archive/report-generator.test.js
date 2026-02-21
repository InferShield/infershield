const fs = require('fs');
const path = require('path');
const { generateReport } = require('../src/report-generator');

describe('Report Generator', () => {
  const sampleData = [
    { field1: 'value1', field2: 'value2' },
    { field1: 'value3', field2: 'value4' }
  ];

  const sampleFields = ['field1', 'field2'];
  const sampleTemplate = '<html><body><h1>Report</h1>{{#each this}}<div>{{field1}} - {{field2}}</div>{{/each}}</body></html>';
  const framework = 'frameworkX';
  const date = '2026-02-21';
  const reportId = 'test_report';

  afterEach(() => {
    // Remove test-generated files
    const dir = path.resolve(__dirname, `../reports/${framework}/${date}`);
    if (fs.existsSync(dir)) {
      fs.rmdirSync(dir, { recursive: true });
    }
  });

  test('Generates PDF report', async () => {
    const filePath = await generateReport('pdf', framework, date, reportId, sampleData, sampleTemplate);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath.endsWith('.pdf')).toBe(true);
  });

  test('Generates CSV report', () => {
    const filePath = generateReport('csv', framework, date, reportId, sampleData, null, sampleFields);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath.endsWith('.csv')).toBe(true);
  });

  test('Generates JSON report', () => {
    const filePath = generateReport('json', framework, date, reportId, sampleData);
    expect(fs.existsSync(filePath)).toBe(true);
    expect(filePath.endsWith('.json')).toBe(true);
  });

  test('Throws error for unsupported type', async () => {
    await expect(generateReport('txt', framework, date, reportId, sampleData)).rejects.toThrow('Unsupported report type: txt');
  });

  test('Throws error if required arguments are missing for PDF', async () => {
    await expect(generateReport('pdf', framework, date, reportId, sampleData)).rejects.toThrow('Template HTML is required for PDF generation');
  });

  test('Throws error if required arguments are missing for CSV', () => {
    expect(() => generateReport('csv', framework, date, reportId, sampleData)).toThrow('Fields are required for CSV generation');
  });
});