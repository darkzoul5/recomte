import http from 'http';

const argUrl = process.argv[2];
const envUrl = process.env.TEST_URL;
const baseUrl = process.env.PUBLIC_BASE_URL;

const buildTargetUrl = () => {
	const raw = argUrl || envUrl;
	if (raw) {
		try {
			// If a full URL is provided, use it directly
			return new URL(raw);
		} catch {
			// If a relative URL is provided, try to resolve it against baseUrl
			if (baseUrl) return new URL(raw, baseUrl);
			// Fallback: throw to trigger a helpful error
			throw new Error(`Invalid URL provided: ${raw}`);
		}
	}
	// No explicit URL; use baseUrl as root or default localhost server
	if (baseUrl) return new URL('/', baseUrl);
	return new URL('http://127.0.0.1:3000/');
};

const fetchUrl = (urlObj) => new Promise((resolve, reject) => {
	const protocol = urlObj.protocol === 'https:' ? https : http;
	const port = urlObj.port ? Number(urlObj.port) : (urlObj.protocol === 'https:' ? 443 : 80);
	const req = protocol.request({
		protocol: urlObj.protocol,
		hostname: urlObj.hostname,
		port,
		path: urlObj.pathname + urlObj.search,
		method: 'GET'
	}, (res) => {
		res.on('data', () => {});
		res.on('end', () => resolve({ statusCode: res.statusCode || 0 }));
	});
	req.on('error', reject);
	req.end();
});

const run = async () => {
	const target = buildTargetUrl();
	// Provide more explicit log for CI: show base + path and resolved URL
	const requestedPath = process.env.TEST_PATH || '/';
	console.log(`Testing URL http://127.0.0.1:${PORT}${requestedPath} (resolved: ${target.href})`);
	try {
		const { statusCode } = await fetchUrl(target);
		if (statusCode >= 200 && statusCode < 300) {
			console.log(`PASS: URL reachable (HTTP ${statusCode}).`);
			process.exit(0);
		} else {
			console.error(`FAIL: URL not reachable (HTTP ${statusCode}).`);
			process.exit(1);
		}
	} catch (err) {
		console.error(`FAIL: Could not reach URL: ${target.href}`);
		console.error(err?.message || err);
		process.exit(1);
	}
};

run();
