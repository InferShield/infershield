// InferShield Database Helper for Proxy Logging
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(DB_PATH);

/**
 * Initialize database tables if they don't exist
 */
function initDatabase() {
  db.serialize(() => {
    // API requests table
    db.run(`
      CREATE TABLE IF NOT EXISTS api_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        url TEXT NOT NULL,
        method TEXT,
        request_body TEXT,
        response_body TEXT,
        risk_score INTEGER DEFAULT 0,
        blocked BOOLEAN DEFAULT 0,
        user_id INTEGER,
        api_key_id INTEGER
      )
    `);

    // PII detections table
    db.run(`
      CREATE TABLE IF NOT EXISTS pii_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        detection_type TEXT NOT NULL,
        pattern TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        provider TEXT,
        redacted_value TEXT,
        FOREIGN KEY (request_id) REFERENCES api_requests(id)
      )
    `);

    console.log('[DB] Database initialized');
  });
}

/**
 * Log an API request
 * @param {Object} data - Request data
 * @returns {Promise<number>} Request ID
 */
function logRequest(data) {
  return new Promise((resolve, reject) => {
    const {
      url,
      method = 'UNKNOWN',
      requestBody = '',
      responseBody = '',
      riskScore = 0,
      blocked = false,
      userId = null,
      apiKeyId = null
    } = data;

    db.run(
      `INSERT INTO api_requests (url, method, request_body, response_body, risk_score, blocked, user_id, api_key_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [url, method, requestBody, responseBody, riskScore, blocked ? 1 : 0, userId, apiKeyId],
      function(err) {
        if (err) {
          console.error('[DB] Error logging request:', err);
          reject(err);
        } else {
          console.log(`[DB] Request logged (ID: ${this.lastID})`);
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Log PII detections
 * @param {number} requestId - Associated request ID
 * @param {Array} detections - Array of detection objects
 * @returns {Promise<void>}
 */
function logDetections(requestId, detections) {
  return new Promise((resolve, reject) => {
    if (!detections || detections.length === 0) {
      resolve();
      return;
    }

    const stmt = db.prepare(`
      INSERT INTO pii_detections (request_id, detection_type, pattern, severity, description, provider, redacted_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    detections.forEach(detection => {
      const redactedValue = detection.value ? detection.value.substring(0, 8) + '••••••' : null;
      
      stmt.run(
        requestId,
        detection.type,
        detection.pattern,
        detection.severity,
        detection.description,
        detection.provider || null,
        redactedValue,
        (err) => {
          if (err) {
            console.error('[DB] Error logging detection:', err);
          }
        }
      );
    });

    stmt.finalize((err) => {
      if (err) {
        console.error('[DB] Error finalizing detections:', err);
        reject(err);
      } else {
        console.log(`[DB] Logged ${detections.length} detection(s) for request ${requestId}`);
        resolve();
      }
    });
  });
}

/**
 * Get recent requests (for dashboard/debugging)
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<Array>} Recent requests
 */
function getRecentRequests(limit = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT * FROM api_requests ORDER BY timestamp DESC LIMIT ?`,
      [limit],
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      }
    );
  });
}

/**
 * Get statistics
 * @returns {Promise<Object>} Statistics object
 */
function getStats() {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT 
        COUNT(*) as total_requests,
        SUM(blocked) as blocked_requests,
        AVG(risk_score) as avg_risk_score,
        (SELECT COUNT(*) FROM pii_detections) as total_detections
       FROM api_requests`,
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// Initialize database on module load
initDatabase();

module.exports = {
  logRequest,
  logDetections,
  getRecentRequests,
  getStats,
  db
};
