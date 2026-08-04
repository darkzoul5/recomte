import assert from 'node:assert/strict';
import { validateUrl, validateSlug } from '../src/utils/validation.js';

const xssTestCases = [
	// Valid URLs should pass
	{ name: 'Valid HTTPS URL', input: 'https://example.com', validator: validateUrl, expected: true },
	{ name: 'Valid HTTP URL', input: 'http://example.com', validator: validateUrl, expected: true },
	{ name: 'Valid relative path', input: '/images/caravan-1.jpg', validator: validateUrl, expected: true },
	{ name: 'Valid relative path with query', input: '/caravans?id=1', validator: validateUrl, expected: true },
	{ name: 'Valid relative path with fragment', input: '/page#section', validator: validateUrl, expected: true },

	// JavaScript protocol injection should fail
	{ name: 'XSS: javascript: protocol', input: 'javascript:alert("xss")', validator: validateUrl, expected: false },
	{ name: 'XSS: data: protocol', input: 'data:text/html,<img src=x onerror=alert("xss")>', validator: validateUrl, expected: false },
	{ name: 'XSS: vbscript: protocol', input: 'vbscript:alert("xss")', validator: validateUrl, expected: false },

	// Event handler injection attempts
	{ name: 'XSS: onerror attribute in URL', input: 'image.jpg" onerror="alert(1)', validator: validateUrl, expected: false },
	{ name: 'XSS: onclick attribute', input: '" onclick="alert(1)', validator: validateUrl, expected: false },
	{ name: 'XSS: onload attribute', input: 'image.jpg" onload="malicious()', validator: validateUrl, expected: false },

	// Encoded attack attempts
	{ name: 'XSS: URL encoded javascript', input: 'java%73cript:alert(1)', validator: validateUrl, expected: false },
	{ name: 'XSS: Double encoded protocol', input: 'java%2573cript:alert(1)', validator: validateUrl, expected: false },

	// Edge cases for URL validation
	{ name: 'Empty URL', input: '', validator: validateUrl, expected: false },
	{ name: 'URL with port', input: 'https://example.com:443/path', validator: validateUrl, expected: true },
	{ name: 'URL with auth', input: 'https://user:pass@example.com', validator: validateUrl, expected: true },
	{ name: 'URL with complex query', input: '/search?q=caravan&sort=price&page=1', validator: validateUrl, expected: true },
];

const slugTestCases = [
	// Valid slugs should pass
	{ name: 'Valid slug: simple', input: 'caravan-one', validator: validateSlug, expected: true },
	{ name: 'Valid slug: with numbers', input: 'caravan-2025-model', validator: validateSlug, expected: true },
	{ name: 'Valid slug: with underscores', input: 'camper_van_deluxe', validator: validateSlug, expected: true },
	{ name: 'Valid slug: lowercase conversion', input: 'MyCaravan', validator: validateSlug, expected: true },

	// XSS/Injection attempts in slugs
	{ name: 'XSS: script tag in slug', input: 'caravan<script>alert(1)</script>', validator: validateSlug, expected: false },
	{ name: 'XSS: quote in slug', input: 'caravan"onmouseover="alert(1)', validator: validateSlug, expected: false },
	{ name: 'XSS: HTML tag in slug', input: 'caravan<img src=x onerror=alert(1)>', validator: validateSlug, expected: false },
	{ name: 'XSS: JavaScript in slug', input: 'javascript:alert(1)', validator: validateSlug, expected: false },

	// Special characters that should fail
	{ name: 'Invalid: space in slug', input: 'caravan one', validator: validateSlug, expected: false },
	{ name: 'Invalid: special char !', input: 'caravan!', validator: validateSlug, expected: false },
	{ name: 'Invalid: special char @', input: 'caravan@model', validator: validateSlug, expected: false },
	{ name: 'Invalid: special char #', input: 'caravan#deluxe', validator: validateSlug, expected: false },
	{ name: 'Invalid: special char $', input: 'caravan$', validator: validateSlug, expected: false },
	{ name: 'Invalid: semicolon', input: 'caravan;drop', validator: validateSlug, expected: false },
	{ name: 'Invalid: equals sign', input: 'caravan=value', validator: validateSlug, expected: false },

	// Edge cases
	{ name: 'Empty slug', input: '', validator: validateSlug, expected: false },
	{ name: 'Very long slug', input: 'a'.repeat(255), validator: validateSlug, expected: true },
	{ name: 'Slug too long', input: 'a'.repeat(256), validator: validateSlug, expected: false },
	{ name: 'Only hyphens', input: '---', validator: validateSlug, expected: true },
	{ name: 'Only underscores', input: '___', validator: validateSlug, expected: true },
];

const allTestCases = [...xssTestCases, ...slugTestCases];

let passed = 0;
let failed = 0;

for (const testCase of allTestCases) {
	try {
		const result = testCase.validator(testCase.input);
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
