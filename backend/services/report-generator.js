const { dispatchReportTask } = require("../workers/report-worker");

const ReportGenerator = {
  async generateReport(data) {
    const startTime = Date.now();

    // Perform data aggregation
    const aggregation = await this.aggregateData(data);
    const aggregationTime = Date.now() - startTime;

    // Offload PDF generation to worker pool
    const pdfStartTime = Date.now();
    const { pdfBuffer, generationTime } = await dispatchReportTask({
      reportId: data.reportId,
      template: data.template,
      data: aggregation,
    });
    const pdfTime = Date.now() - pdfStartTime;

    return {
      pdfBuffer,
      metrics: {
        aggregationTimeMs: aggregationTime,
        pdfGenerationTimeMs: pdfTime,
        totalTimeMs: Date.now() - startTime,
      },
    };
  },

  async aggregateData(filters) {
    // Your data aggregation logic
    return [];
  },
};

module.exports = ReportGenerator;