import { execFile } from 'child_process';
import { promisify } from 'util';
import { sanitizeFileName } from './string-utils';
import { Template } from '../types/types';
import { getDeliveryBackend } from './delivery/backend';

const execFileAsync = promisify(execFile);

/**
 * Check if the `obsidian` CLI is available on PATH.
 */
async function hasObsidianCli(): Promise<boolean> {
	try {
		await execFileAsync('obsidian', ['version']);
		return true;
	} catch {
		return false;
	}
}

/**
 * Create/append/prepend a note via the Obsidian CLI.
 */
async function openViaObsidianCli(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean
): Promise<string> {
	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';
	const vaultArgs = vault ? [`vault=${vault}`] : [];

	if (isDailyNote) {
		const command = behavior === 'append-daily' ? 'daily:append' : 'daily:prepend';
		const { stdout } = await execFileAsync('obsidian', [
			command,
			`content=${fileContent}`,
			...vaultArgs,
		]);
		return stdout.trim();
	}

	const normalizedPath = path && !path.endsWith('/') ? path + '/' : path;
	const formattedNoteName = sanitizeFileName(noteName);
	const filePath = normalizedPath + formattedNoteName + '.md';

	if (behavior === 'append-specific' || behavior === 'prepend-specific') {
		const command = behavior === 'append-specific' ? 'append' : 'prepend';
		const { stdout } = await execFileAsync('obsidian', [
			command,
			`path=${filePath}`,
			`content=${fileContent}`,
			...vaultArgs,
		]);
		return stdout.trim();
	}

	// create or overwrite
	const args = [
		'create',
		`path=${filePath}`,
		`content=${fileContent}`,
		'open',
		...vaultArgs,
	];
	if (behavior === 'overwrite') {
		args.push('overwrite');
	}

	const { stdout } = await execFileAsync('obsidian', args);
	return stdout.trim();
}

/**
 * Open a note in Obsidian via URI scheme (fallback / legacy mode).
 */
async function openViaUri(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean
): Promise<void> {
	const isDailyNote = behavior === 'append-daily' || behavior === 'prepend-daily';

	let obsidianUrl: string;
	if (isDailyNote) {
		obsidianUrl = `obsidian://daily?`;
	} else {
		const normalizedPath = path && !path.endsWith('/') ? path + '/' : path;
		const formattedNoteName = sanitizeFileName(noteName);
		obsidianUrl = `obsidian://new?file=${encodeURIComponent(normalizedPath + formattedNoteName)}`;
	}

	if (behavior.startsWith('append')) {
		obsidianUrl += '&append=true';
	} else if (behavior.startsWith('prepend')) {
		obsidianUrl += '&prepend=true';
	} else if (behavior === 'overwrite') {
		obsidianUrl += '&overwrite=true';
	}

	if (vault) {
		obsidianUrl += `&vault=${encodeURIComponent(vault)}`;
	}

	if (silent) {
		obsidianUrl += '&silent=true';
	}

	obsidianUrl += `&content=${encodeURIComponent(fileContent)}`;

	const platform = process.platform;
	if (platform === 'darwin') {
		await execFileAsync('open', [obsidianUrl]);
	} else if (platform === 'win32') {
		await execFileAsync('powershell', ['-Command', 'Start-Process', '-Uri', obsidianUrl]);
	} else {
		await execFileAsync('xdg-open', [obsidianUrl]);
	}
}

/**
 * Send a note to the target app via the DeliveryBackend.
 *
 * The backend is selected at build time via DELIVERY_BACKEND (Logseq in this
 * build). The Obsidian CLI fast-path (`obsidian` shell command) is only
 * attempted when DELIVERY_BACKEND === 'obsidian'; Logseq has no equivalent
 * CLI, so we always go through the backend's URI builder.
 */
export async function openInObsidian(
	fileContent: string,
	noteName: string,
	path: string,
	vault: string,
	behavior: Template['behavior'],
	silent: boolean,
	forceUri: boolean
): Promise<string> {
	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (DELIVERY_BACKEND === 'obsidian' && !forceUri && await hasObsidianCli()) {
		const result = await openViaObsidianCli(fileContent, noteName, path, vault, behavior, silent);
		return result;
	}

	// Delegate to the active DeliveryBackend. In a Logseq build this produces
	// a logseq://x-callback-url/quickCapture URL and opens it via the OS
	// handler (cli-stubs.ts intercepts the runtime.sendMessage call).
	const backend = getDeliveryBackend();
	await backend.save({ fileContent, noteName, path, vault, behavior, silentOpen: silent });
	const targetName = backend.kind === 'logseq' ? 'Logseq' : 'Obsidian';
	return `Opened in ${targetName}${vault ? ` (vault: ${vault})` : ''}`;
}
