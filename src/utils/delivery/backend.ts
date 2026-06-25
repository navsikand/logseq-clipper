import type { Property, Template } from '../../types/types';
import { obsidianBackend } from './obsidian-backend';
import { logseqBackend } from './logseq-backend';

/**
 * The active delivery backend. Injected at build time via webpack/esbuild DefinePlugin.
 * Declared in src/types/delivery.d.ts.
 */
declare const DELIVERY_BACKEND: BackendKind;

export type BackendKind = 'obsidian' | 'logseq';

export interface SaveParams {
	/** Already-assembled file content (frontmatter + body, post-combineContent). */
	fileContent: string;
	noteName: string;
	path: string;
	vault: string;
	behavior: Template['behavior'];
	silentOpen: boolean;
}

export interface DeliveryBackend {
	readonly kind: BackendKind;
	/** Whether clipboard-first delivery is supported. Logseq returns false (no &clipboard URI flag). */
	readonly supportsClipboardDelivery: boolean;
	/** Generate app-specific frontmatter / page-properties. */
	generateFrontmatter(properties: Property[]): Promise<string>;
	/** Combine frontmatter and body into final file content. Obsidian: concat. Logseq: wrap body in bullets. */
	combineContent(frontmatter: string, body: string): string;
	/** Deliver content to the target app. */
	save(params: SaveParams): Promise<void>;
}

const backends: Record<BackendKind, DeliveryBackend> = {
	obsidian: obsidianBackend,
	logseq: logseqBackend,
};

/**
 * Returns the active delivery backend, selected at build time by DELIVERY_BACKEND.
 *
 * Both backends are imported statically so bundlers can resolve them at build time.
 * Dead-code elimination will tree-shake the unused backend in production builds
 * when DELIVERY_BACKEND is a string-literal constant (DefinePlugin replaces it).
 */
export function getDeliveryBackend(kind: BackendKind = DELIVERY_BACKEND): DeliveryBackend {
	return backends[kind] ?? backends.obsidian;
}
