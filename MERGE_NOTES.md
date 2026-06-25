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

Phase 6 simulates the test matrix via `src/utils/delivery/phase6-matrix.test.ts`.
All 13 scenarios pass at the URI/output level. The actual Logseq-side test
(opening the URLs against a running Logseq desktop app) is a manual step
that requires a developer machine — see instructions below the table.

| # | Scenario | Result |
|---|---|---|
| 1 | Clip regular page, `create` behavior | PASS — `page=Test%20Page`, no `&append`, content has bullets |
| 2 | Clip with `append-daily` | PASS — `page=TODAY&append=true` |
| 3 | `tags` property (multitext) | PASS — `tags:: web,highlight,clip` (comma-joined, no quotes) |
| 4 | `number` property | PASS — `rating:: 42` |
| 5 | `checkbox` property | PASS — `published:: true` |
| 6 | `date` property | PASS — `date:: 2026-06-25` |
| 7 | Multiple properties together | PASS — all `key:: value` lines emitted before body |
| 8 | Highlighter → clip highlights | PASS — body wrapped as `* bullet` lines |
| 9 | Reader mode opens | NOT TESTED (browser-only; manual) |
| 10 | Highlights viewer opens | NOT TESTED (browser-only; manual) |
| 11 | Long content (>2000 chars) | PASS — URI constructs; whether Logseq accepts is a runtime question |
| 12 | Special chars in title | PASS — `?#&` stripped, page name remains non-empty |
| 12b | Namespace via path | PASS — `page=Clippings/Inbox` |
| 13 | silentOpen flag | PASS — `&silent=true` appended |

Manual browser test instructions:
1. `npm run build:chrome`
2. Load `dist/` as an unpacked extension in Chrome
3. Open a readable webpage
4. Click the Logseq Web Clipper icon
5. For each scenario above, configure the template (behavior/properties) and clip
6. Verify the result appears correctly in a running Logseq desktop app

## Known issues / follow-ups

- **`obsidian://` strings in popup.js bundle**: dead code from `obsidian-backend.ts` isn't fully tree-shaken by terser (it conservatively keeps the fallback branch). Functionally inert (unreachable at runtime), adds ~2KB. Could be eliminated via dynamic `import()` but that would complicate the test story.
- **`youtube` template-integration test**: fails in BOTH upstream and this branch due to a timezone-dependent timestamp fixture. Not a regression.
- **`window.__obsidianHighlighter` global**: kept as-is (upstream renamed from fork's `logseqHighlighterInitialized` boolean to an API bridge object). If both Obsidian Web Clipper AND Logseq Web Clipper are installed in the same browser, they would clash on this global. Niche scenario; documented for future fix.
- **DOM element IDs** (`obsidian-clipper-iframe`, `obsidian-clipper-container`): same niche clash risk if both extensions run on the same page.
- **Vault UI**: vault settings section in settings.html is hidden for Logseq via runtime DOM manipulation. The vault dropdown in popup self-hides when no vaults are configured. Users who manually add vaults via the (now-hidden) settings UI could still see the dropdown, but the Logseq backend ignores the vault param.
- **CLI / API bin name**: published as `logseq-clipper` (see Phase 7).
- **Both-extensions-running scenario**: not handled; would require renaming all internal identifiers (against minimal-rebrand decision).

