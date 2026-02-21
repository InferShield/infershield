const { generateAuditData } = require('../services/audit-aggregator');
const { generateReportFile } = require('../services/report-generator');
const { saveReport, getReportList, getReportDetails, deleteReportById } = require('../database/complianceReportsDAO');
const cacheService = require('../services/cache-service');
const reportWorker = require('../workers/report-worker');
const auditLogger = require('../services/audit-logger');
const path = require('path');
const fs = require('fs');

exports.generateReport = async (req, res) => {
    const { framework, startDate, endDate, format, templateType } = req.body;
    const userId = req.user?.id;
    const ipAddress = req.ip;

    try {
        // Check cache for pre-aggregated data
        const cacheKey = `${framework}:${startDate}:${endDate}`;
        let auditData = await cacheService.get(`report:data:${cacheKey}`);

        if (!auditData) {
            // Cache miss - generate using worker thread
            const workerJob = {
                framework,
                startDate,
                endDate,
                userId
            };

            const workerResult = await reportWorker.generate(workerJob);
            
            if (!workerResult.success) {
                throw new Error(workerResult.error);
            }

            auditData = workerResult.data;
            
            // Cache for 1 hour
            await cacheService.set(`report:data:${cacheKey}`, auditData, 3600);
        }

        // Generate report file
        const reportFile = await generateReportFile(auditData, format, templateType);
        const reportMetadata = await saveReport({ 
            framework, 
            startDate, 
            endDate, 
            format, 
            templateType, 
            filePath: reportFile,
            userId
        });

        // Audit log
        await auditLogger.logReportGenerated(
            userId,
            reportMetadata.id,
            `${framework}_${format}`,
            ipAddress,
            { templateType, cached: !!auditData }
        );

        res.status(201).json({ 
            reportId: reportMetadata.id, 
            status: 'Generated', 
            filePath: reportFile,
            cached: !!auditData
        });
    } catch (error) {
        // Audit log failure
        await auditLogger.log({
            action: 'report.generation_failed',
            userId,
            resourceType: 'report',
            ipAddress,
            metadata: { error: error.message, framework, startDate, endDate },
            outcome: 'failure'
        });

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
    const userId = req.user?.id;
    const ipAddress = req.ip;

    try {
        const report = await getReportDetails(id);
        if (!report || !fs.existsSync(report.filePath)) {
            await auditLogger.logAccessDenied(
                'report.download_denied',
                userId,
                'report',
                id,
                ipAddress,
                'report_not_found'
            );
            return res.status(404).json({ error: 'Report file not found' });
        }

        // Audit log successful download
        await auditLogger.logReportAccessed(userId, id, ipAddress, { action: 'download' });

        res.download(path.resolve(report.filePath));
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.deleteReport = async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    const ipAddress = req.ip;

    try {
        const isDeleted = await deleteReportById(id);
        if (!isDeleted) {
            await auditLogger.logAccessDenied(
                'report.delete_denied',
                userId,
                'report',
                id,
                ipAddress,
                'report_not_found'
            );
            return res.status(404).json({ error: 'Report not found' });
        }

        // Audit log successful deletion
        await auditLogger.logReportDeleted(userId, id, ipAddress);

        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};