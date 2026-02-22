const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'agentic_firewall.db'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    agent_id TEXT,
    prompt TEXT,
    response TEXT,
    status TEXT,
    risk_score INTEGER
  );

  CREATE TABLE IF NOT EXISTS policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    description TEXT,
    rule_type TEXT,
    rule_value TEXT,
    action TEXT,
    enabled INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    severity TEXT,
    message TEXT,
    agent_id TEXT,
    log_id INTEGER
  );
`);

// Seed some test data
const policies = db.prepare('SELECT COUNT(*) as count FROM policies').get();
if (policies.count === 0) {
  db.prepare(`INSERT INTO policies (name, description, rule_type, rule_value, action) VALUES 
    ('Block PII Keywords', 'Prevents prompts containing sensitive PII keywords', 'keyword', 'ssn,credit_card,password', 'block'),
    ('SQL Injection Detection', 'Detects SQL injection patterns', 'pattern', 'DROP TABLE|UNION SELECT', 'block'),
    ('Rate Limiting', 'Limits agent requests per minute', 'rate', '100', 'throttle')`).run();
}

// Basic route
app.get('/', (req, res) => {
  res.json({ status: 'running', message: 'InferShield Backend API' });
});

// Analyze prompt endpoint
app.post('/api/analyze', (req, res) => {
  const { prompt, agent_id } = req.body;
  
  // Simple injection detection
  let risk_score = 0;
  let threats = [];
  
  // Check for SQL injection patterns
  if (/DROP|DELETE|INSERT|UPDATE|UNION|SELECT/i.test(prompt)) {
    risk_score += 30;
    threats.push('SQL injection pattern detected');
  }
  
  // Check for prompt injection attempts
  if (/ignore (previous|all) instructions/i.test(prompt)) {
    risk_score += 50;
    threats.push('Prompt injection attempt detected');
  }
  
  // Check for PII keywords
  if (/ssn|social security|credit card|password/i.test(prompt)) {
    risk_score += 20;
    threats.push('PII keywords detected');
  }
  
  const status = risk_score >= 50 ? 'blocked' : risk_score >= 30 ? 'warning' : 'allowed';
  
  // Log the interaction
  const result = db.prepare(
    'INSERT INTO logs (agent_id, prompt, status, risk_score) VALUES (?, ?, ?, ?)'
  ).run(agent_id || 'test-agent', prompt, status, risk_score);
  
  // Create alert if high risk
  if (risk_score >= 30) {
    db.prepare(
      'INSERT INTO alerts (severity, message, agent_id, log_id) VALUES (?, ?, ?, ?)'
    ).run(
      risk_score >= 50 ? 'critical' : 'warning',
      threats.join('; '),
      agent_id || 'test-agent',
      result.lastInsertRowid
    );
  }
  
  res.json({
    status,
    risk_score,
    threats,
    log_id: result.lastInsertRowid
  });
});

// Get logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = db.prepare('SELECT * FROM logs ORDER BY timestamp DESC LIMIT ?').all(limit);
  res.json(logs);
});

// Get policies
app.get('/api/policies', (req, res) => {
  const policies = db.prepare('SELECT * FROM policies').all();
  res.json(policies);
});

// Create policy
app.post('/api/policies', (req, res) => {
  const { name, description, rule_type, rule_value, action } = req.body;
  const result = db.prepare(
    'INSERT INTO policies (name, description, rule_type, rule_value, action) VALUES (?, ?, ?, ?, ?)'
  ).run(name, description, rule_type, rule_value, action);
  res.json({ id: result.lastInsertRowid });
});

// Get alerts
app.get('/api/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ?').all(limit);
  res.json(alerts);
});

// Get stats
app.get('/api/stats', (req, res) => {
  const total_logs = db.prepare('SELECT COUNT(*) as count FROM logs').get().count;
  const blocked = db.prepare('SELECT COUNT(*) as count FROM logs WHERE status = "blocked"').get().count;
  const warnings = db.prepare('SELECT COUNT(*) as count FROM logs WHERE status = "warning"').get().count;
  const alerts = db.prepare('SELECT COUNT(*) as count FROM alerts').get().count;
  
  res.json({
    total_requests: total_logs,
    blocked_requests: blocked,
    warnings: warnings,
    active_alerts: alerts
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🛡️  InferShield Backend running on http://0.0.0.0:${PORT}`);
  console.log(`📊 Dashboard will be available at http://0.0.0.0:3000`);
});
