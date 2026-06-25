/**
 * Build-time constant injected by webpack/esbuild DefinePlugin.
 * Controls which delivery backend (Obsidian vs Logseq) is active.
 */
declare const DELIVERY_BACKEND: 'obsidian' | 'logseq';
