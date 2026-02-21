const { Worker } = require('worker_threads');
const path = require('path');
const EventEmitter = require('events');

/**
 * Report worker pool for async report generation
 * Uses worker threads to avoid blocking the main thread
 */
class ReportWorker extends EventEmitter {
  constructor(maxWorkers = 4) {
    super();
    this.maxWorkers = maxWorkers;
    this.workers = [];
    this.queue = [];
    this.activeJobs = new Map();
  }

  /**
   * Generate report asynchronously
   * @param {Object} job - Report generation job
   * @returns {Promise<Object>} - Job result
   */
  async generate(job) {
    const jobId = `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: jobId,
        job,
        resolve,
        reject
      });

      this.processQueue();
    });
  }

  /**
   * Process job queue
   */
  processQueue() {
    // Remove inactive workers
    this.workers = this.workers.filter(w => !w.terminated);

    // Start new workers if under limit and jobs available
    while (this.workers.length < this.maxWorkers && this.queue.length > 0) {
      const queuedJob = this.queue.shift();
      this.startWorker(queuedJob);
    }
  }

  /**
   * Start a worker for a job
   * @param {Object} queuedJob - Queued job with resolve/reject
   */
  startWorker(queuedJob) {
    const { id, job, resolve, reject } = queuedJob;
    
    const worker = new Worker(path.join(__dirname, '../workers/report-worker-thread.js'), {
      workerData: { job }
    });

    worker.terminated = false;
    this.workers.push(worker);
    this.activeJobs.set(id, { worker, job });

    worker.on('message', (result) => {
      this.activeJobs.delete(id);
      worker.terminate();
      worker.terminated = true;
      resolve(result);
      this.processQueue();
    });

    worker.on('error', (error) => {
      this.activeJobs.delete(id);
      worker.terminate();
      worker.terminated = true;
      reject(error);
      this.processQueue();
    });

    worker.on('exit', (code) => {
      if (code !== 0 && !worker.terminated) {
        this.activeJobs.delete(id);
        reject(new Error(`Worker stopped with exit code ${code}`));
        this.processQueue();
      }
    });
  }

  /**
   * Get worker pool status
   * @returns {Object}
   */
  getStatus() {
    return {
      activeWorkers: this.workers.filter(w => !w.terminated).length,
      maxWorkers: this.maxWorkers,
      queuedJobs: this.queue.length,
      activeJobs: this.activeJobs.size
    };
  }

  /**
   * Terminate all workers
   */
  async terminate() {
    await Promise.all(this.workers.map(w => w.terminate()));
    this.workers = [];
    this.queue = [];
    this.activeJobs.clear();
  }
}

module.exports = new ReportWorker();
