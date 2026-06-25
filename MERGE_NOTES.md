# Merge Notes — upstream sync v1.7.0

Working branch: `feat/sync-upstream-1.7.0`
Fork point: `097dda4` (9 Dec 2024)
Upstream HEAD: `48228dc` (v1.7.0, 16 Jun 2026)
Commits being merged: 352 upstream + 22 fork-only

## Baseline (fork main @ ec376d9)

- `npm install`: OK (220 packages, Node 24.16)
- `npm run build:chrome`: **FAILS with 3 TypeScript errors** in `src/content.ts:26` and `src/core/popup.ts:198` — both are `OnMessageListenerCallback` return-type issues caused by newer `@types/webextension-polyfill`. These are **pre-existing** in the fork and not caused by this merge.

## Decisions locked in

1. Extract `DeliveryBackend` abstraction now (not deferred)
2. Big-bang merge of all 352 upstream commits
3. Keep all upstream features: Defuddle, Highlighter 2.0 + viewer, Reader mode, Template logic engine, CLI + public API, Charts
4. Minimal rebrand: only user-visible strings / manifests / icons say "Logseq"; internal identifiers (`saveToObsidian`, `obsidian-note-creator.ts`, locale keys, CSS classes) stay as upstream names
5. Switch from bun → npm (matches upstream; keeps lockfile in sync on future merges)
6. Pass `path` through to `sanitizeFileName` so users can namespace clips into Logseq page namespaces (e.g. `Clippings/Inbox` → `pages/Clippings___Inbox.md`)
7. Vault UI kept in DOM but hidden via `DELIVERY_BACKEND === 'logseq'` check (preserves merge-friendliness)

## Test matrix (Phase 6)

Filled in during smoke testing.

| # | Scenario | Result |
|---|---|---|
| 1 | Clip regular page, `create` behavior | |
| 2 | Clip with `append-daily` | |
| 3 | `tags` property (multitext) | |
| 4 | `number` property | |
| 5 | `checkbox` property | |
| 6 | `date` property | |
| 7 | Multiple properties | |
| 8 | Highlighter → clip highlights | |
| 9 | Reader mode opens | |
| 10 | Highlights viewer opens | |
| 11 | Long content (>2000 chars) | |
| 12 | Special chars in title | |
| 13 | `cursor` option gone from UI | |

## Known issues / follow-ups

(to be filled in)
