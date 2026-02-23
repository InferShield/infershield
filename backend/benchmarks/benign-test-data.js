/**
 * Test Data for Detection Accuracy Testing
 * Benign requests that should NOT trigger detections (false positive check)
 */

module.exports = {
  benignRequests: [
    // Legitimate prompts
    { type: 'normal_prompt', text: 'What is the weather like today?' },
    { type: 'normal_prompt', text: 'Can you help me write a Python function to sort a list?' },
    { type: 'normal_prompt', text: 'Explain quantum computing in simple terms' },
    { type: 'normal_prompt', text: 'Summarize the key points from this document' },
    { type: 'normal_prompt', text: 'Translate this text to Spanish' },
    
    // JWT tokens (should not be flagged)
    { type: 'jwt_token', text: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c' },
    { type: 'jwt_token', text: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0NTYifQ.abc123' },
    
    // API keys (should not be flagged)
    { type: 'api_key', text: 'sk-proj-abcdef123456789' },
    { type: 'api_key', text: 'Authorization: Bearer pk_live_51234567890abcdef' },
    { type: 'api_key', text: 'AKIAIOSFODNN7EXAMPLE' },
    
    // Benign Base64 data
    { type: 'benign_base64', text: 'SGVsbG8gV29ybGQ=' }, // "Hello World"
    { type: 'benign_base64', text: 'VGhpcyBpcyBhIHRlc3Q=' }, // "This is a test"
    
    // Legitimate SQL-like queries (in proper context)
    { type: 'sql_context', text: 'SELECT * FROM users WHERE id = ?', context: 'parameterized' },
    { type: 'sql_context', text: 'INSERT INTO logs (message) VALUES (?)', context: 'parameterized' },
    
    // HTTP headers (often contain Base64/tokens)
    { type: 'http_header', text: 'Authorization: Basic dXNlcjpwYXNz' },
    { type: 'http_header', text: 'Cookie: session=abc123def456' },
    
    // Code snippets (may contain SQL keywords)
    { type: 'code_snippet', text: 'const query = "SELECT * FROM users"; // example SQL' },
    { type: 'code_snippet', text: 'def get_users(): return db.query("SELECT * FROM users")' },
    
    // Technical documentation
    { type: 'documentation', text: 'To use the API, include your API key in the Authorization header' },
    { type: 'documentation', text: 'The system supports SQL queries for data retrieval' },
    
    // Normal user data
    { type: 'user_data', text: 'My email is user@example.com' },
    { type: 'user_data', text: 'Phone: +1-555-0100' },
    { type: 'user_data', text: 'Address: 123 Main St, City, State 12345' },
    
    // Benign multi-line text
    { type: 'multiline', text: 'This is a long text.\nIt has multiple lines.\nAnd various content.\nBut nothing malicious.' },
    
    // URLs
    { type: 'url', text: 'https://example.com/api/v1/users?id=123' },
    { type: 'url', text: 'https://docs.example.com/guide#section-1' },
    
    // JSON data
    { type: 'json', text: '{"name": "John", "role": "admin", "active": true}' },
    { type: 'json', text: '[{"id": 1, "value": "test"}, {"id": 2, "value": "data"}]' }
  ],
  
  // Expected behavior: None of these should trigger detections
  expectedFalsePositives: 0,
  
  // Categories for analysis
  categories: {
    normal_prompt: 5,
    jwt_token: 2,
    api_key: 3,
    benign_base64: 2,
    sql_context: 2,
    http_header: 2,
    code_snippet: 2,
    documentation: 2,
    user_data: 3,
    multiline: 1,
    url: 2,
    json: 2
  }
};
