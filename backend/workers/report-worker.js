const { Worker, isMainThread, parentPort, workerData } = require("worker_threads");
const os = require("os");
const path = require("path");

if (!isMainThread) {
  // Worker thread logic
  const { reportId, template, data } = workerData;
  const startTime = Date.now();

  // Simulate PDF generation (replace this with actual logic)
  setTimeout(() => {
    const generationTime = Date.now() - startTime;
    parentPort.postMessage({
      pdfBuffer: Buffer.from(`PDF content for report ${reportId}`),
      generationTime,
    });
  }, 2000); // Simulated delay
} else {
  // Worker Pool for Main Thread
  const { Pool } = require("generic-pool");

  const createWorker = () => {
    return new Worker(path.resolve(__filename), {
      workerData: null,
    });
  };

  const WORKER_POOL_SIZE = parseInt(process.env.WORKER_POOL_SIZE || "4", 10);

  const workerPool = Pool({
    create: createWorker,
    destroy: (worker) => worker.terminate(),
    max: WORKER_POOL_SIZE,
  });

  const dispatchReportTask = async (task) => {
    const { reportId, template, data } = task;
    const worker = await workerPool.acquire();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("Worker timeout."));
      }, 30000); // 30s timeout

      worker.once("message", (message) => {
        clearTimeout(timeout);
        resolve(message);
        workerPool.release(worker);
      });

      worker.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
        workerPool.release(worker);
      });

      worker.postMessage({ reportId, template, data });
    });
  };

  module.exports = { workerPool, dispatchReportTask, WORKER_POOL_SIZE };
}