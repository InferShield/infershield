const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const { parse } = require('json2csv');

const OUTPUT_DIR = path.resolve(__dirname, '../reports');

const createReportDir = (framework, date) => {
  const directory = path.join(OUTPUT_DIR, framework, date);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const generatePDF = async (templateHtml, data, outputFilePath) => {
  const template = Handlebars.compile(templateHtml);
  const html = template(data);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  await page.pdf({ path: outputFilePath, format: 'A4' });
  await browser.close();
};

const generateCSV = (data, fields, outputFilePath) => {
  const opts = { fields };
  const csv = parse(data, opts);
  fs.writeFileSync(outputFilePath, csv);
};

const generateJSON = (data, outputFilePath) => {
  const jsonContent = JSON.stringify(data, null, 2);
  fs.writeFileSync(outputFilePath, jsonContent);
};

const generateReport = async (type, framework, date, reportId, data, templateHtml = null, fields = null) => {
  const dir = createReportDir(framework, date);
  const filePath = path.join(dir, `${reportId}.${type}`);

  try {
    switch (type) {
      case 'pdf':
        if (!templateHtml) throw new Error('Template HTML is required for PDF generation');
        await generatePDF(templateHtml, data, filePath);
        break;
      case 'csv':
        if (!fields) throw new Error('Fields are required for CSV generation');
        generateCSV(data, fields, filePath);
        break;
      case 'json':
        generateJSON(data, filePath);
        break;
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
    return filePath;
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

module.exports = {
  generateReport,
};