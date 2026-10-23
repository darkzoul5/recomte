import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_INTERVAL_MS = 3000;
const DEFAULT_REQUEST_TIMEOUT_MS = 5000;
const COMMIT_PATTERN = /^[0-9a-f]{40}$/i;

const parseMilliseconds = (name, fallback) => {
  const value = Number.parseInt(process.env[name] || '', 10);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const sleep = (milliseconds) => new Promise((resolve) => {
  setTimeout(resolve, milliseconds);
});

const buildRequestUrl = (url, attempt) => {
  const requestUrl = new URL(url);
  requestUrl.searchParams.set('_version_check', `${Date.now()}-${attempt}`);
  return requestUrl;
};

const requestVersion = async (url, fetchImpl, requestTimeoutMs) => {
  const controller = new AbortController();
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new Error(`request timed out after ${requestTimeoutMs}ms`));
    }, requestTimeoutMs);
  });

  try {
    const request = (async () => {
      const response = await fetchImpl(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json();
    })();

    return await Promise.race([request, timeout]);
  } finally {
    clearTimeout(timeoutId);
    controller.abort();
  }
};

const validateVersionResponse = (payload, expectedCommit) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('response is not a JSON object');
  }
  if (typeof payload.version !== 'string' || payload.version.length === 0) {
    throw new Error('response has no valid version');
  }
  if (typeof payload.commit !== 'string' || !COMMIT_PATTERN.test(payload.commit)) {
    throw new Error('response has no valid commit SHA');
  }
  if (payload.commit.toLowerCase() !== expectedCommit.toLowerCase()) {
    throw new Error(`commit mismatch: expected ${expectedCommit}, got ${payload.commit}`);
  }

  return { version: payload.version, commit: payload.commit };
};

export const verifyDeploymentVersion = async ({
  url,
  expectedCommit,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  fetchImpl = globalThis.fetch
} = {}) => {
  if (typeof url !== 'string' || url.length === 0) {
    throw new Error('VERSION_URL is required');
  }
  if (typeof expectedCommit !== 'string' || !COMMIT_PATTERN.test(expectedCommit)) {
    throw new Error('EXPECTED_COMMIT must be a full commit SHA');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('fetch is not available');
  }

  const deadline = Date.now() + timeoutMs;
  let attempt = 0;
  let lastError = new Error('verification timed out');

  while (Date.now() <= deadline) {
    attempt++;
    try {
      const payload = await requestVersion(
        buildRequestUrl(url, attempt),
        fetchImpl,
        requestTimeoutMs
      );
      const result = validateVersionResponse(payload, expectedCommit);
      console.log(`Deployment verified: ${result.version} (${result.commit})`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) break;
      console.error(`Deployment verification attempt ${attempt} failed: ${lastError.message}`);
      await sleep(Math.min(intervalMs, remainingMs));
    }
  }

  throw new Error(`deployment verification failed: ${lastError.message}`);
};

const isMainModule = process.argv[1]
  && pathToFileURL(process.argv[1]).href === import.meta.url;

if (isMainModule) {
  verifyDeploymentVersion({
    url: process.env.VERSION_URL,
    expectedCommit: process.env.EXPECTED_COMMIT,
    timeoutMs: parseMilliseconds('VERSION_VERIFY_TIMEOUT_MS', DEFAULT_TIMEOUT_MS),
    intervalMs: parseMilliseconds('VERSION_VERIFY_INTERVAL_MS', DEFAULT_INTERVAL_MS),
    requestTimeoutMs: parseMilliseconds('VERSION_VERIFY_REQUEST_TIMEOUT_MS', DEFAULT_REQUEST_TIMEOUT_MS)
  }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
