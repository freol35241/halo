import { describe, it, expect } from 'vitest';
import { urlBase64ToUint8ArrayTest } from './push-notifications-utils.js';

describe('urlBase64ToUint8Array', () => {
	it('decodes a URL-safe base64 string correctly', () => {
		const result = urlBase64ToUint8ArrayTest('aGVsbG8=');
		expect(result).toBeInstanceOf(Uint8Array);
		// "hello" in base64
		expect(Array.from(result)).toEqual([104, 101, 108, 108, 111]);
	});

	it('handles URL-safe characters (- and _)', () => {
		// base64url for bytes [0xfb, 0xff]
		const result = urlBase64ToUint8ArrayTest('-_8=');
		expect(result).toBeInstanceOf(Uint8Array);
		expect(result[0]).toBe(0xfb);
		expect(result[1]).toBe(0xff);
	});
});
