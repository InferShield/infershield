const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const Handlebars = require('handlebars');
const { parse } = require('json2csv');
const encryptionService = require('./encryption-service');
const metadataStripper = require('./metadata-stripper');
const auditLogger = require('./audit-logger');

const OUTPUT_DIR = path.resolve(__dirname, '../reports');

const createReportDir = (framework, date) => {
  const directory = path.join(OUTPUT_DIR, framework, date);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
};

const generatePDF = async (templateHtml, data, outputFilePath, options = {}) => {
  const { stripMetadata = true, encrypt = false, encryptionKey = null } = options;
  
  const template = Handlebars.compile(templateHtml);
  const html = template(data);
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(html);
  
  // Generate PDF to buffer first (for processing)
  const pdfBuffer = await page.pdf({ format: 'A4' });
  await browser.close();

  let processedBuffer = pdfBuffer;

  // Strip metadata if requested
  if (stripMetadata) {
    processedBuffer = await metadataStripper.stripPdfMetadata(processedBuffer);
  }

  // Encrypt if requested
  if (encrypt && encryptionKey) {
    const encrypted = encryptionService.encryptFile(processedBuffer, encryptionKey);
    // Save encrypted data as JSON with metadata
    fs.writeFileSync(outputFilePath + '.encrypted', JSON.stringify({
      encrypted: encrypted.encrypted.toString('base64'),
      iv: encrypted.iv.toString('base64'),
      authTag: encrypted.authTag.toString('base64'),
      algorithm: encrypted.algorithm
    }));
    return outputFilePath + '.encrypted';
  }

  // Save unencrypted PDF
  fs.writeFileSync(outputFilePath, processedBuffer);
  return outputFilePath;
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

const generateReport = async (type, framework, date, reportId, data, templateHtml = null, fields = null, securityOptions = {}) => {
  const {
    userId = null,
    ipAddress = null,
    stripMetadata = true,
    encrypt = false,
    encryptionKey = null
  } = securityOptions;

  const dir = createReportDir(framework, date);
  const filePath = path.join(dir, `${reportId}.${type}`);

  try {
    let finalPath;
    
    switch (type) {
      case 'pdf':
        if (!templateHtml) throw new Error('Template HTML is required for PDF generation');
        finalPath = await generatePDF(templateHtml, data, filePath, { stripMetadata, encrypt, encryptionKey });
        break;
      case 'csv':
        if (!fields) throw new Error('Fields are required for CSV generation');
        generateCSV(data, fields, filePath);
        finalPath = filePath;
        break;
      case 'json':
        generateJSON(data, filePath);
        finalPath = filePath;
        break;
      default:
        throw new Error(`Unsupported report type: ${type}`);
    }
    
    // Audit log successful report generation
    await auditLogger.logReportGenerated(
      userId,
      reportId,
      `${framework}_${type}`,
      ipAddress,
      {
        framework,
        date,
        encrypted: encrypt,
        metadataStripped: stripMetadata && type === 'pdf'
      }
    );
    
    return finalPath;
  } catch (error) {
    console.error('Error generating report:', error);
    
    // Audit log failed report generation
    if (userId) {
      await auditLogger.log({
        action: 'report.generation_failed',
        userId,
        resourceType: 'report',
        resourceId: reportId,
        ipAddress,
        metadata: { error: error.message, framework, date },
        outcome: 'failure'
      });
    }
    
    throw error;
  }
};

module.exports = {
  generateReport,
};