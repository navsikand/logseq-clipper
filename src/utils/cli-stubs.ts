// Stubs for browser-only modules used in CLI build.
// These are aliased by esbuild so that transitive imports
// of browser-polyfill and storage-utils resolve without error.

import type { Settings } from '../types/types';

/**
 * Open a URL via the OS default handler. Used by the DeliveryBackend's
 * openUrl() path in CLI builds (where browser.runtime.sendMessage does
 * not exist). Mirrors the cross-platform dispatch in cli-utils.ts.
 *
 * Lazy-loads `child_process` so that the API build (platform: 'neutral')
 * doesn't fail on `node:` imports; in non-Node environments the function
 * is never invoked anyway (API consumers handle delivery themselves).
 */
function openUrlViaOS(url: string): void {
	// Guarded require so esbuild's neutral platform doesn't try to resolve.
	const cp = (typeof require === 'function')
		? require('child_process')
		: null;
	if (!cp) {
		// Non-node env (API build, browser, etc.) — fall back to opening via window.
		if (typeof window !== 'undefined' && window.open) {
			window.open(url, '_blank');
		}
		return;
	}
	const platform = process.platform;
	if (platform === 'darwin') {
		cp.execFileSync('open', [url], { stdio: 'ignore' });
	} else if (platform === 'win32') {
		cp.execFileSync('powershell', ['-Command', 'Start-Process', '-Uri', url], { stdio: 'ignore' });
	} else {
		cp.execFileSync('xdg-open', [url], { stdio: 'ignore' });
	}
}

/**
 * Browser-runtime mock. The DeliveryBackend's openUrl() dispatches an
 * `openObsidianUrl` message; in CLI builds we intercept that message and
 * open the URL via the OS handler. The "Obsidian" action name is kept
 * (not renamed) so the message contract matches the browser extension.
 */
export const runtime = {
	sendMessage(message: { action?: string; url?: string }): Promise<unknown> {
		if (message?.action === 'openObsidianUrl' && message.url) {
			try {
				openUrlViaOS(message.url);
			} catch (err) {
				return Promise.reject(err);
			}
		}
		return Promise.resolve({});
	},
	onMessage: { addListener: () => {}, removeListener: () => {} },
	getURL: (p: string) => p,
};

export const tabs = {
	query: async () => [{ id: 0 }],
	update: async () => {},
};

export const storage = {
	local: { get: async () => ({}), set: async () => {} },
	sync: { get: async () => ({}), set: async () => {} },
	onChanged: { addListener: () => {} },
};

export default { runtime, tabs, storage };

export const generalSettings: Settings = {
	vaults: [],
	betaFeatures: false,
	legacyMode: false,
	silentOpen: false,
	openBehavior: 'popup',
	highlighterEnabled: false,
	alwaysShowHighlights: false,
	highlightBehavior: 'no-highlights',
	showMoreActionsButton: false,
	interpreterModel: '',
	models: [],
	providers: [],
	interpreterEnabled: false,
	interpreterAutoRun: false,
	defaultPromptContext: '',
	propertyTypes: [],
	readerSettings: {
		fontSize: 16,
		lineHeight: 1.5,
		maxWidth: 700,
		lightTheme: 'default',
		darkTheme: 'same',
		appearance: 'auto',
		fonts: [],
		defaultFont: '',
		blendImages: true,
		colorLinks: false,
		followLinks: true,
		pinPlayer: true,
		autoScroll: true,
		highlightActiveLine: true,
		customCss: '',
	},
	stats: {
		addToObsidian: 0,
		saveFile: 0,
		copyToClipboard: 0,
		share: 0,
	},
	history: [],
	ratings: [],
	saveBehavior: 'addToObsidian',
};

export const loadSettings = async () => {};
export const saveSettings = async () => {};
export const incrementStat = async () => {};
export const getLocalStorage = async () => ({});
export const setLocalStorage = async () => {};
