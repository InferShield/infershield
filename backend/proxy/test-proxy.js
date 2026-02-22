const https = require('https');

const options = {
  hostname: 'api.openai.com',
  port: 443,
  path: '/v1/engines',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer invalid-test-token'
  }
};

const req = https.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  console.log(`HEADERS: ${JSON.stringify(res.headers)}`);

  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.end();