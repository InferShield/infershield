const { normalizeInput } = require('../inputNormalizer');

describe('normalizeInput', () => {
  test('should decode Base64 encoded malicious payload', () => {
    const input = 'PHNjcmlwdD5hbGVydCgncGF5bG9hZCcpPC9zY3JpcHQ+';
    const output = normalizeInput(input);
    expect(output).toContain('<script>alert');
  });

  test('should decode URL encoded attack payload', () => {
    const input = '%3Cscript%3Ealert(%27payload%27)%3C/script%3E';
    const output = normalizeInput(input);
    expect(output).toBe('<script>alert(\'payload\')</script>');
  });

  test('should decode double encoded payload', () => {
    const input = '%253Cscript%253Ealert(%2527payload%2527)%253C/script%253E';
    const output = normalizeInput(input);
    expect(output).toBe('<script>alert(\'payload\')</script>');
  });

  test('should decode benign Base64 content safely', () => {
    const input = 'U29tZSBzYWZlIGNvbnRlbnQ=';
    const output = normalizeInput(input);
    expect(output).toBe('Some safe content');
  });

  test('should return invalid Base64 as-is', () => {
    const input = 'InvalidBase64===';
    const output = normalizeInput(input);
    expect(output).toBe('InvalidBase64===');
  });

  test('should merge fragmented payloads', () => {
    const input = 'frag ment ed pay load';
    const output = normalizeInput(input);
    expect(output).toBe('fragmentedpayload');
  });

  test('performance should be under 5ms for typical inputs', () => {
    const input = 'Some typical input that might go through normalization';
    const start = process.hrtime();
    normalizeInput(input);
    const end = process.hrtime(start);
    const durationMs = (end[0] * 1e9 + end[1]) / 1e6;
    expect(durationMs).toBeLessThan(5);
  });
});