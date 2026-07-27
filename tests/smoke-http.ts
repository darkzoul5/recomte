import http from 'http';
import https from 'https';

const buildTargetUrl = () => {
	const base = new URL(process.env.PUBLIC_BASE_URL || 'http://127.0.0.1');

	const port = process.env.TEST_PORT || '3000';
	const path = process.env.TEST_PATH || '/';

	base.port = port;
	base.pathname = path.startsWith('/') ? path : `/${path}`;

	return base;
};

const fetchUrl = (urlObj) =>
	new Promise<{ statusCode: number }>((resolve, reject) => {
		const protocol = urlObj.protocol === 'https:' ? https : http;

		const req = protocol.request(
			{
				protocol: urlObj.protocol,
				hostname: urlObj.hostname,
				port: urlObj.port ? Number(urlObj.port) : undefined,
				path: urlObj.pathname + urlObj.search,
				method: 'GET'
			},
			(res) => {
				res.resume();
				res.on('end', () =>
					resolve({ statusCode: res.statusCode || 0 })
				);
			}
		);

		req.on('error', reject);
		req.end();
	});

const run = async () => {
	const target = buildTargetUrl();

	console.log(`Testing: ${target.href}`);

	try {
		const { statusCode } = await fetchUrl(target);

		if (statusCode >= 200 && statusCode < 300) {
			console.log(`PASS: HTTP ${statusCode}`);
			process.exit(0);
		}

		console.error(`FAIL: HTTP ${statusCode}`);
		process.exit(1);
	} catch (err) {
		console.error(`FAIL: ${target.href}`);
		console.error(err?.message || err);
		process.exit(1);
	}
};

run();
