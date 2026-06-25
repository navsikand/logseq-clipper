import browser from '../browser-polyfill';
import { escapeDoubleQuotes } from '../string-utils';
import { Property } from '../../types/types';
import { generalSettings } from '../storage-utils';
import { formatHighlightsToLogseq } from '../formatHighlightsToLogseq';
import { DeliveryBackend, SaveParams } from './backend';

/**
 * Logseq backend.
 *
 * URI scheme:  logseq://x-callback-url/quickCapture?page=<name>&content=<encoded>
 * Frontmatter: Page properties (`key:: value`, double-colon) prefixed by zero-width space.
 * Body:        Wrapped in `* ` bullets (Logseq is an outliner; bare paragraphs don't become blocks).
 * Delivery:    URI-encoded content. Logseq's quickCapture has no `&clipboard` flag,
 *              so clipboard-first delivery is not supported.
 *
 * Behavior mapping (Logseq's quickCapture only distinguishes "create" vs "append"):
 *   create            -> page=<name>
 *   append-daily      -> page=TODAY&append=true
 *   append-specific   -> page=<name>&append=true
 *   prepend-daily     -> page=TODAY&append=true  (Logseq has no prepend; treat as append)
 *   prepend-specific  -> page=<name>&append=true  (same)
 *   overwrite         -> page=<name>              (Logseq has no overwrite; creates/opens page)
 */
export const logseqBackend: DeliveryBackend = {
	kind: 'logseq',
	supportsClipboardDelivery: false,

	async generateFrontmatter(properties: Property[]): Promise<string> {
		let frontmatter = '\u200B\n';
		for (const property of properties) {
			frontmatter += `${property.name}::`;

			const propertyType = generalSettings.propertyTypes.find(p => p.name === property.name)?.type || 'text';

			switch (propertyType) {
				case 'multitext':
					if (property.name === 'tags') {
						const tags = property.value
							.split(' ')
							.map(tag => tag.replace(/,/g, '').trim())
							.filter(tag => tag !== '');
						if (tags.length > 0) {
							const formattedTags = tags.map(tag => `${tag}`).join(',');
							frontmatter += ` ${formattedTags}\n`;
						} else {
							frontmatter += '\n';
						}
						break;
					}
					let items: string[];
					if (property.value.trim().startsWith('["') && property.value.trim().endsWith('"]')) {
						try {
							items = JSON.parse(property.value);
						} catch {
							items = property.value.split(',').map(item => item.trim());
						}
					} else {
						// Split by comma, but keep wikilinks intact
						items = property.value.split(/,(?![^\[]*\]\])/).map(item => item.trim());
					}
					items = items.filter(item => item !== '');
					if (items.length > 0) {
						items.forEach(item => {
							frontmatter += ` ${escapeDoubleQuotes(item)}`;
						});
					}
					frontmatter += '\n';
					break;
				case 'number': {
					const numericValue = property.value.replace(/[^\d.-]/g, '');
					frontmatter += numericValue ? ` ${parseFloat(numericValue)}\n` : '\n';
					break;
				}
				case 'checkbox': {
					const isChecked = typeof property.value === 'boolean' ? property.value : property.value === 'true';
					frontmatter += ` ${isChecked}\n`;
					break;
				}
				case 'date':
				case 'datetime':
					frontmatter += property.value.trim() !== '' ? ` ${property.value}\n` : '\n';
					break;
				default: // Text
					frontmatter += property.value.trim() !== '' ? ` "${escapeDoubleQuotes(property.value)}"\n` : '\n';
			}
		}

		return frontmatter;
	},

	combineContent(frontmatter: string, body: string): string {
		// Logseq is an outliner: body must be wrapped in bullets to become blocks.
		// Frontmatter (page properties) is NOT wrapped — Logseq requires it as plain
		// `key:: value` lines at the top of the page.
		return frontmatter + formatHighlightsToLogseq(body);
	},

	async save(params: SaveParams): Promise<void> {
		const { fileContent, noteName, path, behavior, silentOpen } = params;

		// Logseq has no vault concept; vault param is ignored.
		void params.vault;

		const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';
		const wantsAppend = behavior.startsWith('append') || behavior.startsWith('prepend');

		let pageName: string;
		if (isDailyNote) {
			pageName = 'TODAY';
		} else {
			pageName = sanitizePageName(noteName, path);
		}

		let url = `logseq://x-callback-url/quickCapture?page=${encodeURIComponent(pageName)}`;
		if (isDailyNote || wantsAppend) {
			url += '&append=true';
		}

		if (silentOpen) {
			url += '&silent=true';
		}

		url += `&content=${encodeURIComponent(fileContent)}`;
		openLogseqUrl(url);
	},
};

/**
 * Logseq page-name sanitizer. Lighter than sanitizeFileName because Logseq page names
 * allow `/` (for namespaces like `Clippings/Inbox`) and other characters that file
 * systems disallow — Logseq itself handles page-name → filename conversion (`/` → `___`).
 *
 * Strips control chars and reserved HTML/URI characters that would break the x-callback-url.
 */
function sanitizePageName(name: string, path: string): string {
	let full = name;
	if (path) {
		// Treat path as a namespace prefix. Ensure no leading/trailing slash duplication.
		const cleanPath = path.replace(/^\/+|\/+$/g, '');
		if (cleanPath) {
			full = `${cleanPath}/${name}`;
		}
	}
	// Strip characters that would break the URI or Logseq's page parser.
	return full
		.replace(/[\x00-\x1F\x7F]/g, '') // control chars
		.replace(/[?#&%]/g, '')          // URI-meaningful chars
		.trim()
		.slice(0, 245) || 'Untitled';
}

function openLogseqUrl(url: string): void {
	browser.runtime.sendMessage({
		action: "openObsidianUrl",
		url: url
	}).catch((error) => {
		console.error('Error opening Logseq URL via background script:', error);
		window.open(url, '_blank');
	});
	console.log('Logseq URL:', url);
}
