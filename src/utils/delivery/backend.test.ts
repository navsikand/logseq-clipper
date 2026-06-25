// @vitest-environment jsdom
import { describe, test, expect } from 'vitest';
import { getDeliveryBackend } from './backend';
import { logseqBackend } from './logseq-backend';
import { obsidianBackend } from './obsidian-backend';

describe('getDeliveryBackend — factory', () => {
	test('returns logseq backend when kind="logseq"', () => {
		const b = getDeliveryBackend('logseq');
		expect(b.kind).toBe('logseq');
		expect(b).toBe(logseqBackend);
	});

	test('returns obsidian backend when kind="obsidian"', () => {
		const b = getDeliveryBackend('obsidian');
		expect(b.kind).toBe('obsidian');
		expect(b).toBe(obsidianBackend);
	});

	test('falls back to obsidian for unknown kind', () => {
		// @ts-expect-error testing runtime safety with invalid kind
		const b = getDeliveryBackend('nonsense');
		expect(b.kind).toBe('obsidian');
	});
});
