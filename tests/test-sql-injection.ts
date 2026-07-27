import assert from 'node:assert/strict';
import {
	validateColumnName,
	ALLOWED_CARAVAN_COLUMNS,
	ALLOWED_IMAGE_COLUMNS
} from '../src/utils/validation.ts';

const testCases = [
	// Valid column names should pass
	{ name: 'Valid column: title', input: 'title', allowed: ALLOWED_CARAVAN_COLUMNS, expected: true },
	{ name: 'Valid column: slug', input: 'slug', allowed: ALLOWED_CARAVAN_COLUMNS, expected: true },
	{ name: 'Valid column: price', input: 'price', allowed: ALLOWED_CARAVAN_COLUMNS, expected: true },
	{ name: 'Valid image column: url', input: 'url', allowed: ALLOWED_IMAGE_COLUMNS, expected: true },

	// SQL injection attempts should fail
	{ name: 'SQL injection: DROP TABLE', input: "title; DROP TABLE caravans; --", allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'SQL injection: UNION SELECT', input: "title UNION SELECT * FROM admin_users; --", allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'SQL injection: OR 1=1', input: "title OR 1=1 --", allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'SQL injection: DELETE', input: "title; DELETE FROM caravans; --", allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'SQL injection: UPDATE', input: "title; UPDATE admin_users SET role='admin'; --", allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },

	// Edge cases
	{ name: 'Empty string', input: '', allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'Column with spaces', input: 'title name', allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'Non-string input: null', input: null, allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'Non-string input: number', input: 123, allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
	{ name: 'Non-string input: object', input: {}, allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },

	// Column name variations
	{ name: 'Column with underscore: beds_count', input: 'beds_count', allowed: ALLOWED_CARAVAN_COLUMNS, expected: true },
	{ name: 'Whitespace attempt: " title"', input: ' title', allowed: ALLOWED_CARAVAN_COLUMNS, expected: true }, // Should trim and pass
	{ name: 'Whitespace injection: "title; --"', input: 'title; --', allowed: ALLOWED_CARAVAN_COLUMNS, expected: false },
];

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
	try {
		const result = validateColumnName(testCase.input, testCase.allowed);
		assert.equal(
			result,
			testCase.expected,
			`Expected ${testCase.expected} but got ${result}`
		);
		console.log(`✓ PASS: ${testCase.name}`);
		passed++;
	} catch (error) {
		console.log(`✗ FAIL: ${testCase.name}`);
		console.log(`  ${error.message}`);
		failed++;
	}
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
