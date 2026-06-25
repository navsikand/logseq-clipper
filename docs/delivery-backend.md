# Delivery Backend Abstraction

## Problem

`obsidian-note-creator.ts` hard-codes the Obsidian delivery flow (URI scheme, frontmatter format, clipboard-first strategy). Logseq needs different handling:

| Aspect | Obsidian | Logseq |
|---|---|---|
| URI scheme | `obsidian://new?file=` / `obsidian://daily?` | `logseq://x-callback-url/quickCapture?page=` |
| Frontmatter | YAML (`---\nkey: value\n---`) via `shared.ts::generateFrontmatter` | Page properties (`key:: value`, double-colon) |
| Body | Pass through as-is | Wrap in `* ` bullets (Logseq is an outliner) |
| Clipboard delivery | Supported (`&clipboard` URI flag) | Not supported (Logseq has no equivalent) |
| Path/vault | `path/file` in URI, `&vault=` param | `page` only (no vault); path embedded in page name via `/` |
| URL open | `runtime.sendMessage` → background → fallback `window.open` | Same (we adopt upstream's approach; works for `logseq://` too) |

Without an abstraction, every upstream merge re-derives the diff between the two `obsidian-note-creator.ts` versions.

## Interface

```ts
// src/utils/delivery/backend.ts
export type BackendKind = 'obsidian' | 'logseq';

export interface SaveParams {
  fileContent: string;       // already-assembled (frontmatter + body)
  noteName: string;
  path: string;
  vault: string;
  behavior: Template['behavior'];
  silentOpen: boolean;
}

export interface DeliveryBackend {
  readonly kind: BackendKind;
  readonly supportsClipboardDelivery: boolean;
  /** Generate app-specific frontmatter / page-properties. */
  generateFrontmatter(properties: Property[]): Promise<string>;
  /** Combine frontmatter and body into final file content. Obsidian: concat. Logseq: wrap body in bullets. */
  combineContent(frontmatter: string, body: string): string;
  /** Deliver content to the target app. */
  save(params: SaveParams): Promise<void>;
}

export function getDeliveryBackend(kind: BackendKind): DeliveryBackend;
```

## Public shim

`src/utils/obsidian-note-creator.ts` keeps its current exports (so `popup.ts` and all call sites stay identical on future merges):

```ts
export async function generateFrontmatter(properties: Property[]): Promise<string> {
  return getDeliveryBackend(DELIVERY_BACKEND).generateFrontmatter(properties);
}
export function combineContent(frontmatter: string, body: string): string {
  return getDeliveryBackend(DELIVERY_BACKEND).combineContent(frontmatter, body);
}
export async function saveToObsidian(content, name, path, vault, behavior): Promise<void> {
  return getDeliveryBackend(DELIVERY_BACKEND).save({ fileContent: content, noteName: name, path, vault, behavior, silentOpen: generalSettings.silentOpen });
}
```

The names `saveToObsidian` / `obsidian-note-creator.ts` are kept intentionally (minimal rebrand) to avoid conflicts on every future merge.

## Backend selection

Build-time constant injected by webpack/esbuild `DefinePlugin`:

```js
new webpack.DefinePlugin({
  DELIVERY_BACKEND: JSON.stringify('logseq'),  // or 'obsidian'
})
```

A TypeScript global declaration (`src/types/delivery.d.ts`) declares `DELIVERY_BACKEND` so `tsc` accepts it.

## Files

- `src/utils/delivery/backend.ts` — interface + factory
- `src/utils/delivery/obsidian-backend.ts` — extracted from upstream `obsidian-note-creator.ts`
- `src/utils/delivery/logseq-backend.ts` — Logseq URI + `key:: value` frontmatter + body wrapping
- `src/utils/obsidian-note-creator.ts` — thin facade (preserves public API)
- `src/utils/formatHighlightsToLogseq.ts` — kept (imported by `logseq-backend.ts`)
- `src/types/delivery.d.ts` — global declaration for `DELIVERY_BACKEND`

## Call-site changes

Only `src/core/popup.ts` changes — 5 occurrences of:

```ts
const fileContent = frontmatter + noteContentField.value;
```

become:

```ts
const fileContent = combineContent(frontmatter, noteContentField.value);
```

(Plus the import line: `combineContent` added to the existing `obsidian-note-creator` import.)

All other call sites of `saveToObsidian` / `generateFrontmatter` work unchanged because the facade preserves their signatures.

## Merge recipe for next upstream sync

When upstream changes `obsidian-note-creator.ts`:
1. Re-port the changes into `src/utils/delivery/obsidian-backend.ts` only.
2. `logseq-backend.ts` is independent and needs no changes.
3. The facade in `obsidian-note-creator.ts` only changes if upstream renames `saveToObsidian` or `generateFrontmatter` — rare.

When upstream changes `popup.ts`:
- The 5 `combineContent(...)` call sites will conflict. Resolution: take upstream's side, then `sed 's/frontmatter + noteContentField\.value/combineContent(frontmatter, noteContentField.value)/g'`.
