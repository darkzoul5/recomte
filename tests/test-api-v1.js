import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'recomte-api-v1-'));
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'api-v1-test-session-secret-012345678901';
process.env.SESSION_COOKIE_SECURE = 'false';
process.env.STORAGE_ROOT = tempRoot;
process.env.DB_PATH = path.join(tempRoot, 'db', 'app.db');
process.env.ADMIN_USERNAME = 'api-v1-admin';
process.env.ADMIN_PASSWORD = 'api-v1-password-123';

const extractCookies = (setCookieHeaders = []) => (Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders])
  .filter((header) => typeof header === 'string')
  .map((header) => header.split(';', 1)[0])
  .join('; ');

const extractCsrfToken = (body) => body.match(/name=["']_csrf["'][^>]*value=["']([^"']+)["']/i)?.[1] || '';

const parseResponse = (response) => JSON.parse(response.body);

const main = async () => {
  const { caravans, closeDb, initDb } = await import('../db/db.js');
  await initDb();

  const { buildAdminServer } = await import('../src/server/admin.js');
  const { buildPublicServer } = await import('../src/server/public.js');
  const publicServer = await buildPublicServer();
  const adminServer = await buildAdminServer();

  try {
    caravans.create({
      title: 'API test caravan',
      slug: 'api-test-caravan',
      price: 1000,
      status: 'available',
      camper_season: 'summer',
      features: {}
    });

    const invalidStatus = await publicServer.inject({
      method: 'GET',
      url: '/api/v1/caravans?status=not-a-status'
    });
    assert.equal(invalidStatus.statusCode, 400);
    assert.equal(parseResponse(invalidStatus).error.code, 'INVALID_QUERY_PARAMETER');

    const invalidSeason = await publicServer.inject({
      method: 'GET',
      url: '/api/v1/caravans?camper_season=not-a-season'
    });
    assert.equal(invalidSeason.statusCode, 400);
    assert.equal(parseResponse(invalidSeason).error.code, 'INVALID_QUERY_PARAMETER');

    const loginPage = await adminServer.inject({
      method: 'GET',
      url: '/admin/login'
    });
    assert.equal(loginPage.statusCode, 200);
    const loginCookie = extractCookies(loginPage.headers['set-cookie']);
    const loginCsrfToken = extractCsrfToken(loginPage.body);
    assert.ok(loginCookie);
    assert.ok(loginCsrfToken);

    const loginBody = new URLSearchParams({
      username: process.env.ADMIN_USERNAME,
      password: process.env.ADMIN_PASSWORD,
      _csrf: loginCsrfToken
    }).toString();
    const loginResponse = await adminServer.inject({
      method: 'POST',
      url: '/admin/login',
      headers: {
        cookie: loginCookie,
        'content-type': 'application/x-www-form-urlencoded'
      },
      payload: loginBody
    });
    assert.equal(loginResponse.statusCode, 302);

    const adminCookie = extractCookies(loginResponse.headers['set-cookie']) || loginCookie;
    const dashboard = await adminServer.inject({
      method: 'GET',
      url: '/admin/dash',
      headers: { cookie: adminCookie }
    });
    assert.equal(dashboard.statusCode, 200);
    const apiCsrfToken = extractCsrfToken(dashboard.body);
    assert.ok(apiCsrfToken);

    const createResponse = await adminServer.inject({
      method: 'POST',
      url: '/api/v1/caravans',
      headers: {
        cookie: adminCookie,
        'content-type': 'application/json',
        'x-csrf-token': apiCsrfToken
      },
      payload: JSON.stringify({
        title: 'Zero price caravan',
        slug: 'zero-price-caravan',
        price: 0
      })
    });
    assert.equal(createResponse.statusCode, 201);
    assert.equal(parseResponse(createResponse).data.price, 0);

    console.log('✓ Versioned API tests passed');
  } finally {
    await publicServer.close();
    await adminServer.close();
    closeDb();
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
