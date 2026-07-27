import http from 'http';

const baseUrl = process.env.ADMIN_BASE_URL || 'http://127.0.0.1:3001';
const username = process.env.AUTH_TEST_USERNAME || 'invalid-admin-user';
const password = process.env.AUTH_TEST_PASSWORD || 'invalid-password';

const loginUrl = new URL('/admin/login', baseUrl);
const csrfRegex = /name=["']_csrf["'][^>]*value=["']([^"']+)["']/i;

const extractCookieHeader = (setCookieHeaders = []) => {
  const cookies = [];
  for (const entry of setCookieHeaders) {
    if (typeof entry !== 'string') continue;
    const firstPart = entry.split(';')[0];
    if (firstPart) cookies.push(firstPart);
  }
  return cookies.join('; ');
};

const requestHttp = ({ method, headers = {}, body = '' }) => new Promise<{ statusCode: number; body: string; headers: http.IncomingHttpHeaders }>((resolve, reject) => {
  const request = http.request({
    protocol: loginUrl.protocol,
    hostname: loginUrl.hostname,
    port: loginUrl.port,
    path: loginUrl.pathname,
    method,
    headers
  }, (response) => {
    let responseBody = '';
    response.on('data', (chunk) => {
      responseBody += chunk.toString();
    });
    response.on('end', () => {
      resolve({
        statusCode: response.statusCode || 0,
        body: responseBody,
        headers: response.headers
      });
    });
  });

  request.on('error', reject);
  if (body) {
    request.write(body);
  }
  request.end();
});

const fetchLoginPage = async () => {
  const response = await requestHttp({ method: 'GET' });
  const csrfMatch = response.body.match(csrfRegex);
  const csrfToken = csrfMatch?.[1] || '';
  const cookieHeader = extractCookieHeader(response.headers['set-cookie'] || []);

  return {
    statusCode: response.statusCode,
    csrfToken,
    cookieHeader
  };
};

const postLogin = async ({ csrfToken, cookieHeader }) => {
  const payload = new URLSearchParams({ username, password });
  if (csrfToken !== undefined) {
    payload.set('_csrf', csrfToken);
  }

  const body = payload.toString();
  return requestHttp({
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(body),
      ...(cookieHeader ? { Cookie: cookieHeader } : {})
    },
    body
  });
};

const assertStatus = (name, actual, expected) => {
  if (actual !== expected) {
    throw new Error(`${name}: expected HTTP ${expected}, received HTTP ${actual}`);
  }
};

const run = async () => {
  console.log(`Testing CSRF behavior on ${loginUrl.origin}${loginUrl.pathname}`);

  const loginPage = await fetchLoginPage();
  assertStatus('GET /admin/login', loginPage.statusCode, 200);

  if (!loginPage.csrfToken) {
    throw new Error('Could not extract CSRF token from login page');
  }

  const missingToken = await postLogin({ csrfToken: undefined, cookieHeader: loginPage.cookieHeader });
  assertStatus('Missing token', missingToken.statusCode, 403);

  const wrongToken = await postLogin({ csrfToken: 'invalid-token-value', cookieHeader: loginPage.cookieHeader });
  assertStatus('Wrong token', wrongToken.statusCode, 403);

  const validToken = await postLogin({ csrfToken: loginPage.csrfToken, cookieHeader: loginPage.cookieHeader });
  assertStatus('Valid token', validToken.statusCode, 200);

  console.log('PASS: CSRF checks behave as expected (missing=403, wrong=403, correct=200).');
};

run().catch((error) => {
  console.error('FAIL:', error.message || error);
  process.exit(1);
});
