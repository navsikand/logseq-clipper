A fork of the official [Obsidian Web Clipper](https://github.com/obsidianmd/obsidian-clipper), adapted for Logseq. Logseq Web Clipper is a browser extension that helps you highlight and save web pages.

Clips are delivered to Logseq via the [`logseq://x-callback-url/quickCapture`](https://github.com/logseq/logseq/blob/master/src/electron/electron/url.cljs) URI scheme, which works with the standard file-based (markdown) Logseq graph. Page properties use Logseq's `key:: value` syntax; note content is wrapped as bullet blocks so it lands as proper outliner blocks rather than a single preformatted blob.

## Installation

Available for Chromium-based browsers like Chrome, Brave, and Arc, as well as Firefox:
- [Chrome Web Store](https://chromewebstore.google.com/detail/logseq-web-clipper/fhjehofpeafndgabgbehflkncpmdldgg)  
- [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/logseq-web-clipper/?utm_source=addons.mozilla.org&utm_medium=referral&utm_content=search)

> Note: store listings may lag the latest release on `main`. To try unreleased work, build from source (below).

## Features

Inherits all upstream features as of Obsidian Web Clipper v1.7.0:

- **Reader mode** — a distraction-free article view (Firefox-Reader-style)
- **Highlighter 2.0** — highlight text on web pages, then clip the highlights
- **Highlights viewer** — browse and export saved highlights
- **Template logic engine** — conditionals and flow control in templates
- **Schema.org-aware extractors** —via [Defuddle](https://github.com/kepano/defuddle)
- **CLI + programmatic API** — `logseq-clipper <url>` (see below)
- **49 filters** with full test coverage
- **36 locales**

Plus Logseq-specific delivery:
- `logseq://x-callback-url/quickCapture` URI scheme
- `key:: value` page properties (double-colon, not YAML)
- Body wrapped as `* ` bullets so content lands as Logseq blocks
- Optional page-name namespaces via the path field (e.g. `Clippings/Inbox`)

## Developers

To build the extension:

```
npm run build
```

This will create three directories:
- `dist/` for the Chromium version
- `dist_firefox/` for the Firefox version
- `dist_safari/` for the Safari version

### Install the extension locally

For Chromium browsers, such as Chrome, Brave, Edge, and Arc:

1. Open your browser and navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `dist` directory

For Firefox:

1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Navigate to the `dist_firefox` directory and select the `manifest.json` file

### CLI

```
npm run build:cli
node dist/cli.cjs <url> -t <template.json> --open --uri
```

`--uri` mode emits a `logseq://x-callback-url/quickCapture?...` URL and dispatches it via the OS handler (`open` on macOS, `xdg-open` on Linux, `Start-Process` on Windows). Requires Logseq desktop to be running and registered as the `logseq://` handler.

### Architecture

The Logseq vs Obsidian delivery logic is isolated behind a `DeliveryBackend` interface (selected at build time via the `DELIVERY_BACKEND` constant injected by webpack/esbuild). See [`docs/delivery-backend.md`](docs/delivery-backend.md) for the design and the merge recipe for future upstream syncs.

## Third-party libraries

- [webextension-polyfill](https://github.com/mozilla/webextension-polyfill) for browser compatibility
- [defuddle](https://github.com/kepano/defuddle) for content extraction and HTML-to-Markdown conversion
- [dayjs](https://github.com/iamkun/dayjs) for date parsing and formatting
- [lz-string](https://github.com/pieroxy/lz-string) to compress templates to reduce storage space
- [lucide](https://github.com/lucide-icons/lucide) for icons
- [dompurify](https://github.com/cure53/DOMPurify) for sanitizing HTML
- [highlight.js](https://github.com/highlightjs/highlight.js) for code highlighting in Reader mode
- [linkedom](https://github.com/WebReflection/linkedom) for DOM parsing in CLI/API environments
