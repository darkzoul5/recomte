import http from 'http';

const baseUrl = process.env.PUBLIC_BASE_URL;
const target = new URL('/', baseUrl);

const fetchRoot = () => new Promise((resolve, reject) => {
	const req = http.request({
		protocol: target.protocol,
		hostname: target.hostname,
		port: target.port,
		path: target.pathname,
		method: 'GET'
	}, (res) => {
		// Consume data to finish the request
		res.on('data', () => {});
		res.on('end', () => {
			resolve({ statusCode: res.statusCode || 0 });
		});
	});
	req.on('error', reject);
	req.end();
});

const run = async () => {
	console.log(`Testing ${baseUrl} website reachability at ${target.origin}${target.pathname}`);
	try {
		const result = await fetchRoot();
		const status = result.statusCode;
		if (status >= 200 && status < 300) {
			console.log(`PASS: ${baseUrl} website reachable (HTTP ${status}).`);
			process.exit(0);
		} else {
			console.error(`FAIL: ${baseUrl} website not r
eachable (HTTP ${status}).`);
			process.exit(1);
		}
	} catch (err) {
		console.error(`FAIL: Could not reach ${baseUrl} website.`);
		console.error(err?.message || err);
		process.exit(1);
	}
};

run();
