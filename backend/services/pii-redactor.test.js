const {
  detectPII,
  redactPII,
  RedactionStrategy,
  PII_PATTERNS
} = require('./pii-redactor');

describe('PII Detection', () => {
  test('detects SSN', () => {
    const text = 'My SSN is 123-45-6789';
    const detected = detectPII(text, { patterns: ['ssn'] });
    
    expect(detected).toHaveLength(1);
    expect(detected[0].type).toBe('ssn');
    expect(detected[0].value).toBe('123-45-6789');
    expect(detected[0].severity).toBe('critical');
  });
  
  test('detects credit card', () => {
    const text = 'Card: 4532-1488-0343-6467';
    const detected = detectPII(text, { patterns: ['credit_card'] });
    
    expect(detected).toHaveLength(1);
    expect(detected[0].type).toBe('credit_card');
    expect(detected[0].name).toBe('Credit Card');
  });
  
  test('detects email', () => {
    const text = 'Contact me at john.doe@example.com';
    const detected = detectPII(text, { patterns: ['email'] });
    
    expect(detected).toHaveLength(1);
    expect(detected[0].type).toBe('email');
    expect(detected[0].value).toBe('john.doe@example.com');
  });
  
  test('detects phone number', () => {
    const text = 'Call me at (555) 123-4567';
    const detected = detectPII(text, { patterns: ['phone'] });
    
    expect(detected).toHaveLength(1);
    expect(detected[0].type).toBe('phone');
  });
  
  test('detects multiple PII types', () => {
    const text = 'SSN: 123-45-6789, Email: test@example.com, Phone: 555-1234';
    const detected = detectPII(text);
    
    expect(detected.length).toBeGreaterThan(0);
    const types = detected.map(d => d.type);
    expect(types).toContain('ssn');
    expect(types).toContain('email');
  });
  
  test('validates credit card with Luhn', () => {
    const validCard = '4532015112830366'; // Valid test card
    const invalidCard = '1234567812345678';
    
    const validDetection = detectPII(validCard, { 
      patterns: ['credit_card'],
      validateMatches: true 
    });
    
    const invalidDetection = detectPII(invalidCard, { 
      patterns: ['credit_card'],
      validateMatches: true 
    });
    
    expect(validDetection.length).toBeGreaterThan(0);
    expect(invalidDetection).toHaveLength(0);
  });
  
  test('detects AWS keys', () => {
    const text = 'Key: AKIAIOSFODNN7EXAMPLE';
    const detected = detectPII(text, { patterns: ['aws_key'] });
    
    expect(detected).toHaveLength(1);
    expect(detected[0].type).toBe('aws_key');
    expect(detected[0].severity).toBe('critical');
  });
});

describe('PII Redaction', () => {
  test('redacts SSN with MASK strategy', () => {
    const text = 'My SSN is 123-45-6789';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.MASK,
      patterns: ['ssn']
    });
    
    expect(result.redacted).toBe('My SSN is [SSN_REDACTED]');
    expect(result.changed).toBe(true);
    expect(result.detections).toHaveLength(1);
  });
  
  test('redacts SSN with PARTIAL strategy', () => {
    const text = 'My SSN is 123-45-6789';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.PARTIAL,
      patterns: ['ssn']
    });
    
    expect(result.redacted).toBe('My SSN is XXX-XX-6789');
    expect(result.changed).toBe(true);
  });
  
  test('redacts credit card with PARTIAL strategy', () => {
    const text = 'Card: 4532-1488-0343-6467';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.PARTIAL,
      patterns: ['credit_card']
    });
    
    expect(result.redacted).toContain('XXXX-XXXX-XXXX-6467');
  });
  
  test('redacts email with PARTIAL strategy', () => {
    const text = 'Email: john.doe@example.com';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.PARTIAL,
      patterns: ['email']
    });
    
    expect(result.redacted).toContain('j***@example.com');
  });
  
  test('redacts with HASH strategy', () => {
    const text = 'SSN: 123-45-6789';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.HASH,
      patterns: ['ssn']
    });
    
    expect(result.redacted).toMatch(/SSN: \[[a-f0-9]{8}\]/);
    expect(result.changed).toBe(true);
  });
  
  test('redacts with REMOVE strategy', () => {
    const text = 'My SSN is 123-45-6789 and my email is test@example.com';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.REMOVE,
      patterns: ['ssn', 'email']
    });
    
    expect(result.redacted).not.toContain('123-45-6789');
    expect(result.redacted).not.toContain('test@example.com');
  });
  
  test('generates tokens with TOKEN strategy', () => {
    const text = 'SSN: 123-45-6789';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.TOKEN,
      patterns: ['ssn'],
      tokenKey: 'test-key'
    });
    
    expect(result.redacted).toMatch(/SSN: \[TOKEN_[a-f0-9]+\]/);
    expect(result.tokens).toBeDefined();
    expect(Object.keys(result.tokens).length).toBeGreaterThan(0);
  });
  
  test('redacts multiple PII items', () => {
    const text = 'SSN: 123-45-6789, Email: test@example.com, Phone: 555-1234';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.MASK
    });
    
    expect(result.changed).toBe(true);
    expect(result.detections.length).toBeGreaterThan(1);
    expect(result.redacted).toContain('_REDACTED');
  });
  
  test('handles text with no PII', () => {
    const text = 'This is a normal sentence with no sensitive data';
    const result = redactPII(text);
    
    expect(result.changed).toBe(false);
    expect(result.redacted).toBe(text);
    expect(result.detections).toHaveLength(0);
  });
  
  test('preserves text structure after redaction', () => {
    const text = 'Name: John\nSSN: 123-45-6789\nEmail: john@example.com';
    const result = redactPII(text, { 
      strategy: RedactionStrategy.MASK,
      patterns: ['ssn', 'email']
    });
    
    expect(result.redacted).toContain('Name: John');
    expect(result.redacted).toContain('\n');
  });
});

describe('PII Pattern Coverage', () => {
  test('all patterns are defined', () => {
    expect(PII_PATTERNS).toBeDefined();
    expect(Object.keys(PII_PATTERNS).length).toBeGreaterThan(0);
  });
  
  test('each pattern has required fields', () => {
    for (const [key, pattern] of Object.entries(PII_PATTERNS)) {
      expect(pattern.pattern).toBeInstanceOf(RegExp);
      expect(pattern.name).toBeDefined();
      expect(pattern.severity).toBeDefined();
      expect(pattern.category).toBeDefined();
    }
  });
  
  test('severity levels are valid', () => {
    const validSeverities = ['critical', 'high', 'medium', 'low'];
    
    for (const pattern of Object.values(PII_PATTERNS)) {
      expect(validSeverities).toContain(pattern.severity);
    }
  });
});

describe('Edge Cases', () => {
  test('handles empty string', () => {
    const result = redactPII('');
    expect(result.changed).toBe(false);
    expect(result.redacted).toBe('');
  });
  
  test('handles very long text', () => {
    const longText = 'a'.repeat(10000) + ' SSN: 123-45-6789 ' + 'b'.repeat(10000);
    const result = redactPII(longText, { patterns: ['ssn'] });
    
    expect(result.changed).toBe(true);
    expect(result.redacted).toContain('[SSN_REDACTED]');
  });
  
  test('handles special characters', () => {
    const text = 'SSN: 123-45-6789 (confidential!)';
    const result = redactPII(text, { patterns: ['ssn'] });
    
    expect(result.redacted).toContain('[SSN_REDACTED]');
    expect(result.redacted).toContain('(confidential!)');
  });
  
  test('handles overlapping patterns', () => {
    const text = 'API Key: AKIAIOSFODNN7EXAMPLE1234567890ABCDEF';
    const result = redactPII(text, { patterns: ['aws_key', 'api_key'] });
    
    expect(result.changed).toBe(true);
    expect(result.detections.length).toBeGreaterThan(0);
  });
});
