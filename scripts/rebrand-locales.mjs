#!/usr/bin/env node
// Rebrand script: applies Logseq substitutions to all locale messages.json files.
// Conservative — only touches user-visible strings, never key names.
// Run from repo root: node scripts/rebrand-locales.mjs

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const LOCALES_DIR = new URL('../src/_locales/', import.meta.url).pathname;

// Substitution rules. Order matters — longer/more-specific patterns first.
// Each rule is [pattern, replacement]. Patterns are global; replacements use plain strings.
const RULES = [
	// Specific multi-word phrases first
	[/Obsidian Web Clipper/g, 'Logseq Web Clipper'],
	[/Obsidian URL/g, 'Logseq URL'],
	[/(^|[\.\s])The official browser extension for Obsidian/g, '$1The unofficial browser extension for Logseq'],
	[/Obsidian does not gather/g, 'Logseq does not gather'],
	[/Obsidian does not store/g, 'Logseq does not store'],
	[/Open in Obsidian/g, 'Open in Logseq'],
	[/Add to Obsidian/g, 'Add to Logseq'],
	[/Shared from Obsidian/g, 'Shared from Logseq'],
	[/Saved to Obsidian/g, 'Saved to Logseq'],
	[/Clipped to Obsidian/g, 'Clipped to Logseq'],
	[/Obsidian account/g, 'Logseq account'],
	[/your Obsidian/gi, 'your Logseq'],
	[/Obsidian app/gi, 'Logseq app'],
	[/Obsidian desktop/gi, 'Logseq desktop'],
	[/Obsidian sync/gi, 'Logseq sync'],
	// Help/docs URLs — point to Logseq docs root (no deep-link equivalents).
	// NOTE: stop at whitespace, quote, OR backslash so we don't consume the JSON
	// escape char before the closing quote (e.g. `href=\"https://...\"`).
	[/https:\/\/help\.obsidian\.md\/[^\s"\\]*/g, 'https://docs.logseq.com/'],
	[/https:\/\/help\.obsidian\.md/g, 'https://docs.logseq.com/'],
	// Literal ".obsidian" config folder name → "logseq" (Logseq's config dir is `logseq/`)
	[/\.obsidian\b/g, 'logseq'],
	// Version-pinned warnings that are Obsidian-specific
	[/Adding to an existing note or daily note requires Obsidian [^."]*\./g,
		'Adding to an existing note or daily note requires a recent version of Logseq.'],
	[/Uses the URI clipping method compatible with Obsidian [^."]*\./g,
		'Uses the URI clipping method. Note that the length of the content you can clip is limited by your browser and OS. Some pages may fail without any errors.'],
	// Vault references — keep functional (vault UI is hidden for Logseq but kept in DOM for merge-friendliness)
	// We do NOT scrub vaults/vault here; those strings remain available if the UI is ever re-enabled.
	// Catch-all "Obsidian" → "Logseq" for any remaining user-visible references.
	// Done LAST so specific phrases above take precedence.
	[/Obsidian/g, 'Logseq'],
];

let totalChanges = 0;
let filesChanged = 0;

const locales = await readdir(LOCALES_DIR);
for (const locale of locales) {
	const file = join(LOCALES_DIR, locale, 'messages.json');
	let src;
	try {
		src = await readFile(file, 'utf8');
	} catch {
		continue;
	}
	const original = src;
	for (const [pattern, replacement] of RULES) {
		src = src.replace(pattern, replacement);
	}
	if (src !== original) {
		filesChanged++;
		// Count rough change delta
		const before = original.length;
		const after = src.length;
		totalChanges += Math.abs(after - before);
		await writeFile(file, src, 'utf8');
		console.log(`  rebranded: ${locale}`);
	}
}
console.log(`\nDone. ${filesChanged} files updated, ~${totalChanges} chars changed.`);
