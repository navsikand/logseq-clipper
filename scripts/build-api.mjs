import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

await esbuild.build({
	entryPoints: [path.join(root, 'src/api.ts')],
	bundle: true,
	platform: 'neutral',
	format: 'esm',
	outfile: path.join(root, 'dist/api.mjs'),
	external: [
		'defuddle',
		'defuddle/full',
		'dayjs',
		// Node built-in used (lazily, in a guarded require) by cli-stubs.ts for
		// the DeliveryBackend's URL-open path. Marked external so the neutral
		// platform build doesn't try to bundle it; the code path is only
		// reachable in Node, never in API-consumer environments.
		'child_process',
	],
	define: {
		'DEBUG_MODE': 'false',
		// Route all API clips through the Logseq backend (Logseq variant of the clipper).
		// See docs/delivery-backend.md.
		'DELIVERY_BACKEND': '"logseq"',
	},
	alias: {
		'webextension-polyfill': path.join(root, 'src/utils/cli-stubs.ts'),
	},
	logLevel: 'info',
});

console.log('API built successfully → dist/api.mjs');
