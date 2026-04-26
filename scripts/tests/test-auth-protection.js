import http from 'http';

const baseUrl = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:3001';
const attempts = parseInt(process.env.AUTH_TEST_ATTEMPTS || '8', 10);
const username = process.env.AUTH_TEST_USERNAME || 'invalid-admin-user';
const password = process.env.AUTH_TEST_PASSWORD || 'invalid-password';

const target = new URL('/admin/login', baseUrl);

const postLoginAttempt = () => new Promise((resolve, reject) => {
  const body = new URLSearchParams({ username, password }).toString();

  const request = http.request({
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port,
    path: target.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body)
    }
  }, (response) => {
    let responseBody = '';

    response.on('data', (chunk) => {
      responseBody += chunk.toString();
    });

    response.on('end', () => {
      resolve({
        statusCode: response.statusCode || 0,
        retryAfter: response.headers['retry-after'] || null,
        body: responseBody
      });
    });
  });

  request.on('error', reject);
  request.write(body);
  request.end();
});

const run = async () => {
  console.log(`Testing admin auth protection at ${target.origin}${target.pathname}`);
  console.log(`Sending ${attempts} failed login attempts...`);

  const results = [];

  for (let i = 1; i <= attempts; i += 1) {
    const result = await postLoginAttempt();
    results.push(result);

    const marker = result.statusCode === 429 ? 'LOCKED/RATE-LIMITED' : 'ALLOWED';
    console.log(`#${i}: HTTP ${result.statusCode} (${marker})`);
  }

  const first429Index = results.findIndex((result) => result.statusCode === 429);
  if (first429Index >= 0) {
    const first429 = results[first429Index];
    const retryAfterText = first429.retryAfter ? ` Retry-After=${first429.retryAfter}s` : '';
    console.log(`PASS: Protection triggered on attempt #${first429Index + 1}.${retryAfterText}`);
    process.exit(0);
  }

  console.error('FAIL: Protection did not trigger (no HTTP 429 observed).');
  console.error('Tip: Ensure admin server is running and auth thresholds are not set too high for this test.');
  process.exit(1);
};

run().catch((error) => {
  console.error('FAIL: Could not complete auth protection test.');
  console.error(error.message || error);
  process.exit(1);
});
