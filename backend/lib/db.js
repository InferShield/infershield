// InferShield Database Helper for Proxy Logging
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../database.db');
const db = new sqlite3.Database(DB_PATH);

/**
 * Check if a column exists in a table
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {Promise<boolean>}
 */
function columnExists(tableName, columnName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        const exists = rows.some(row => row.name === columnName);
        resolve(exists);
      }
    });
  });
}

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
    `, (err) => {
      if (err) {
        console.error('[DB] Error creating api_requests table:', err);
      } else {
        // Add new columns if they don't exist (safe migration)
        columnExists('api_requests', 'request_id').then(exists => {
          if (!exists) {
            db.run(`ALTER TABLE api_requests ADD COLUMN request_id TEXT`, (err) => {
              if (err) {
                console.error('[DB] Error adding request_id column:', err);
              } else {
                console.log('[DB] Added request_id column to api_requests');
              }
            });
          }
        });

        columnExists('api_requests', 'latency_ms').then(exists => {
          if (!exists) {
            db.run(`ALTER TABLE api_requests ADD COLUMN latency_ms INTEGER`, (err) => {
              if (err) {
                console.error('[DB] Error adding latency_ms column:', err);
              } else {
                console.log('[DB] Added latency_ms column to api_requests');
              }
            });
          }
        });
      }
    });

    // PII detections table
    db.run(`
      CREATE TABLE IF NOT EXISTS pii_detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        detection_type TEXT NOT NULL,
        pattern TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT,
        provider TEXT,
        redacted_value TEXT
      )
    `);

    console.log('[DB] Database initialized');
  });
}

/**
 * Log an API request
 * @param {Object} data - Request data
 * @returns {Promise<number>} Request ID (integer primary key)
 */
function logRequest(data) {
  return new Promise((resolve, reject) => {
    const {
      requestId = null,
      url,
      method = 'UNKNOWN',
      requestBody = '',
      responseBody = '',
      riskScore = 0,
      blocked = false,
      latencyMs = null,
      userId = null,
      apiKeyId = null
    } = data;

    db.run(
      `INSERT INTO api_requests (request_id, url, method, request_body, response_body, risk_score, blocked, latency_ms, user_id, api_key_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [requestId, url, method, requestBody, responseBody, riskScore, blocked ? 1 : 0, latencyMs, userId, apiKeyId],
      function(err) {
        if (err) {
          console.error('[DB] Error logging request:', err);
          reject(err);
        } else {
          console.log(`[DB] Request logged (ID: ${this.lastID}, request_id: ${requestId})`);
          resolve(this.lastID);
        }
      }
    );
  });
}

/**
 * Log PII detections
 * @param {string|number} requestId - Associated request_id (string UUID) or legacy integer ID
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
        String(requestId), // Convert to string for compatibility
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
  columnExists,
  db
};
