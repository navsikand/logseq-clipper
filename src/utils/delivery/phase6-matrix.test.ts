// @vitest-environment jsdom
//
// Phase 6 test-matrix simulation.
//
// We can't run a real browser + Logseq in CI, but we CAN exercise the
// backend end-to-end (frontmatter generation + content wrapping + URL
// construction) and assert on the URL/output that Logseq would receive.
// A developer can then manually paste the failing/successful URLs into a
// browser to confirm against a running Logseq instance.

import { describe, test, expect, vi } from 'vitest';

vi.mock('../storage-utils', () => ({
	generalSettings: {
		propertyTypes: [
			{ name: 'tags', type: 'multitext' },
			{ name: 'rating', type: 'number' },
			{ name: 'published', type: 'checkbox' },
			{ name: 'date', type: 'date' },
			{ name: 'author', type: 'multitext' },
			{ name: 'title', type: 'text' },
		],
		silentOpen: false,
	},
}));

import { logseqBackend } from './logseq-backend';
import type { Property, Template } from '../../types/types';

// Capture URLs by intercepting the browser.runtime.sendMessage mock.
const capturedUrls: string[] = [];
beforeEach(() => { capturedUrls.length = 0; });

import { runtime } from 'webextension-polyfill';
const originalSend = runtime.sendMessage;
beforeEach(() => {
	runtime.sendMessage = async (msg: any) => {
		if (msg?.url) capturedUrls.push(msg.url);
		return {};
	};
});
afterEach(() => { runtime.sendMessage = originalSend; });

import { beforeEach, afterEach } from 'vitest';

// Decode the content= parameter from a captured URL.
function decodeContent(url: string): string {
	const m = url.match(/&content=([^&]+)/);
	if (!m) return '';
	return decodeURIComponent(m[1]);
}
function decodePage(url: string): string {
	const m = url.match(/[?&]page=([^&]+)/);
	if (!m) return '';
	return decodeURIComponent(m[1]);
}
function hasFlag(url: string, flag: string): boolean {
	return url.includes(flag);
}

describe('Phase 6 test matrix — simulated', () => {
	test('#1: clip regular page, create behavior, page name "Test Page"', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'title', value: 'Test' },
		]);
		const fileContent = logseqBackend.combineContent(fm, 'First paragraph.\nSecond paragraph.');
		await logseqBackend.save({
			fileContent, noteName: 'Test Page', path: '', vault: '',
			behavior: 'create', silentOpen: false,
		});
		expect(capturedUrls).toHaveLength(1);
		expect(decodePage(capturedUrls[0])).toBe('Test Page');
		expect(hasFlag(capturedUrls[0], '&append=true')).toBe(false);
		const body = decodeContent(capturedUrls[0]);
		expect(body).toContain('title:: "Test"');
		expect(body).toContain('* First paragraph.');
		expect(body).toContain('* Second paragraph.');
	});

	test('#2: clip with append-daily behavior', async () => {
		await logseqBackend.save({
			fileContent: 'daily content', noteName: 'whatever',
			path: '', vault: '', behavior: 'append-daily', silentOpen: false,
		});
		expect(decodePage(capturedUrls[0])).toBe('TODAY');
		expect(hasFlag(capturedUrls[0], '&append=true')).toBe(true);
		expect(decodeContent(capturedUrls[0])).toContain('daily content');
	});

	test('#3: tags property (multitext) -> comma-joined, no quotes', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'tags', value: 'web highlight clip' },
		]);
		expect(fm).toContain('tags:: web,highlight,clip');
	});

	test('#4: number property', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'rating', value: '42' },
		]);
		expect(fm).toContain('rating:: 42');
	});

	test('#5: checkbox property', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'published', value: 'true' },
		]);
		expect(fm).toContain('published:: true');
	});

	test('#6: date property', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'date', value: '2026-06-25' },
		]);
		expect(fm).toContain('date:: 2026-06-25');
	});

	test('#7: multiple properties together at top', async () => {
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'tags', value: 'a b' },
			{ id: '2', name: 'rating', value: '5' },
			{ id: '3', name: 'published', value: 'false' },
			{ id: '4', name: 'date', value: '2026-06-25' },
			{ id: '5', name: 'title', value: 'Multi' },
		]);
		const lines = fm.split('\n');
		expect(lines[0]).toBe('\u200B'); // ZWSP prefix line
		expect(lines[1]).toContain('tags::');
		expect(lines[2]).toContain('rating::');
		expect(lines[3]).toContain('published::');
		expect(lines[4]).toContain('date::');
		expect(lines[5]).toContain('title::');
		// All property lines come before any body content (caller's responsibility).
	});

	test('#8: highlighter-style content wrapped as bullets', () => {
		const result = logseqBackend.combineContent(
			'\u200B\ntags:: hi\n',
			'> A highlighted quote.\nSome context.',
		);
		// Properties stay plain, body gets bullets.
		expect(result).toContain('tags:: hi');
		expect(result).not.toContain('* tags::');
		expect(result).toContain('* > A highlighted quote.');
		expect(result).toContain('* Some context.');
	});

	test('#11: long content (>2000 chars) — URI is constructed without error', async () => {
		const longBody = 'Lorem ipsum '.repeat(500); // ~6000 chars
		const fm = await logseqBackend.generateFrontmatter([
			{ id: '1', name: 'title', value: 'Big' },
		]);
		const fileContent = logseqBackend.combineContent(fm, longBody);
		await logseqBackend.save({
			fileContent, noteName: 'Big', path: '', vault: '',
			behavior: 'create', silentOpen: false,
		});
		// The URL just needs to be constructed; whether Logseq accepts a long URI
		// is a runtime question outside the extension's control.
		expect(capturedUrls[0].length).toBeGreaterThan(6000);
		expect(capturedUrls[0]).toMatch(/^logseq:\/\//);
	});

	test('#12: special chars in title are sanitized', async () => {
		await logseqBackend.save({
			fileContent: 'x',
			noteName: 'Title?With#Special&Chars',
			path: '', vault: '', behavior: 'create', silentOpen: false,
		});
		const page = decodePage(capturedUrls[0]);
		expect(page).not.toMatch(/[?#&]/);
		expect(page.length).toBeGreaterThan(0);
	});

	test('#12b: namespace via path -> page name uses slash separator', async () => {
		await logseqBackend.save({
			fileContent: 'x',
			noteName: 'Inbox',
			path: 'Clippings', vault: '',
			behavior: 'create', silentOpen: false,
		});
		const page = decodePage(capturedUrls[0]);
		expect(page).toBe('Clippings/Inbox');
	});

	test('#13: silentOpen adds &silent=true', async () => {
		await logseqBackend.save({
			fileContent: 'x', noteName: 'Quiet', path: '', vault: '',
			behavior: 'create', silentOpen: true,
		});
		expect(capturedUrls[0]).toContain('&silent=true');
	});

	test('frontmatter always starts with zero-width space (Logseq convention)', async () => {
		const fm = await logseqBackend.generateFrontmatter([]);
		expect(fm.startsWith('\u200B')).toBe(true);
	});
});
