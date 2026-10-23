import assert from 'node:assert/strict';
import { verifyDeploymentVersion } from '../scripts/verify-deployment-version.js';

const expectedCommit = '0123456789abcdef0123456789abcdef01234567';
const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body
});

const runCase = async (name, test) => {
  try {
    await test();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
};

await runCase('matching version succeeds', async () => {
  const result = await verifyDeploymentVersion({
    url: 'https://example.test/api/version',
    expectedCommit,
    timeoutMs: 20,
    intervalMs: 0,
    fetchImpl: async () => response({ version: 'v1.2.3', commit: expectedCommit })
  });

  assert.deepEqual(result, { version: 'v1.2.3', commit: expectedCommit });
});

await runCase('version mismatch fails', async () => {
  await assert.rejects(
    verifyDeploymentVersion({
      url: 'https://example.test/api/version',
      expectedCommit,
      timeoutMs: 20,
      intervalMs: 0,
      fetchImpl: async () => response({
        version: 'v1.2.3',
        commit: 'fedcba9876543210fedcba9876543210fedcba98'
      })
    }),
    /commit mismatch/
  );
});

await runCase('HTTP errors fail', async () => {
  await assert.rejects(
    verifyDeploymentVersion({
      url: 'https://example.test/api/version',
      expectedCommit,
      timeoutMs: 20,
      intervalMs: 0,
      fetchImpl: async () => response({}, 503)
    }),
    /HTTP 503/
  );
});

await runCase('malformed responses fail', async () => {
  await assert.rejects(
    verifyDeploymentVersion({
      url: 'https://example.test/api/version',
      expectedCommit,
      timeoutMs: 20,
      intervalMs: 0,
      fetchImpl: async () => response({ version: 'v1.2.3' })
    }),
    /valid commit SHA/
  );
});

await runCase('request timeout fails', async () => {
  await assert.rejects(
    verifyDeploymentVersion({
      url: 'https://example.test/api/version',
      expectedCommit,
      timeoutMs: 20,
      intervalMs: 0,
      requestTimeoutMs: 5,
      fetchImpl: () => new Promise(() => {})
    }),
    /timed out|verification failed/
  );
});
