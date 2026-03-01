const pino = require('pino');

const level = process.env.LOG_LEVEL || 'info';

// Use structured JSON logs by default.
// If you want pretty logs locally:
//   LOG_PRETTY=1 node server.js
const pretty = process.env.LOG_PRETTY === '1';

let transport;
if (pretty) {
  transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname'
    }
  };
}

const logger = pino({
  level,
  base: undefined,
  redact: {
    paths: [
      // Guardrails: never log full prompts / secrets
      'prompt',
      'redacted_prompt',
      'req.body.prompt',
      'req.headers.authorization'
    ],
    censor: '[REDACTED]'
  },
  transport
});

module.exports = logger;
