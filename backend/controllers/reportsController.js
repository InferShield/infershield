const { generateAuditData } = require('../services/audit-aggregator');
const { generateReportFile } = require('../services/report-generator');
const { saveReport, getReportList, getReportDetails, deleteReportById } = require('../database/complianceReportsDAO');
const path = require('path');
const fs = require('fs');

exports.generateReport = async (req, res) => {
    const { framework, startDate, endDate, format, templateType } = req.body;

    try {
        const auditData = await generateAuditData(framework, startDate, endDate);
        const reportFile = await generateReportFile(auditData, format, templateType);
        const reportMetadata = await saveReport({ framework, startDate, endDate, format, templateType, filePath: reportFile });

        res.status(201).json({ reportId: reportMetadata.id, status: 'Generated', filePath: reportFile });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getReports = async (req, res) => {
    const { page = 1, limit = 10 } = req.query;

    try {
        const reports = await getReportList(page, limit);
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getReportById = async (req, res) => {
    const { id } = req.params;

    try {
        const report = await getReportDetails(id);
        if (!report) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.downloadReport = async (req, res) => {
    const { id } = req.params;

    try {
        const report = await getReportDetails(id);
        if (!report || !fs.existsSync(report.filePath)) {
            return res.status(404).json({ error: 'Report file not found' });
        }
        res.download(path.resolve(report.filePath));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteReport = async (req, res) => {
    const { id } = req.params;

    try {
        const isDeleted = await deleteReportById(id);
        if (!isDeleted) {
            return res.status(404).json({ error: 'Report not found' });
        }
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};