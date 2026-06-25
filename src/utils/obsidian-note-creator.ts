import { Template, Property } from '../types/types';
import { generalSettings } from './storage-utils';
import { getDeliveryBackend } from './delivery/backend';

/**
 * Thin facade over the active DeliveryBackend.
 *
 * The public API (function names, signatures, file name) is intentionally kept
 * identical to upstream obsidian-clipper so that future upstream merges touch
 * this file rarely. Backend selection happens at build time via the
 * `DELIVERY_BACKEND` constant injected by webpack/esbuild DefinePlugin.
 *
 * See docs/delivery-backend.md for the full design.
 */

export async function generateFrontmatter(properties: Property[]): Promise<string> {
	return getDeliveryBackend().generateFrontmatter(properties);
}

export function combineContent(frontmatter: string, body: string): string {
	return getDeliveryBackend().combineContent(frontmatter, body);
}

export async function saveToObsidian(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
): Promise<void> {
	return getDeliveryBackend().save({
		fileContent,
		noteName,
		path,
		vault,
		behavior,
		silentOpen: generalSettings.silentOpen,
	});
}
