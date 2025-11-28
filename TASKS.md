## Relevant Files

- `manifest.json` - MV3 manifest configuring permissions, content script, background service worker, and options page.
- `src/contentScript.ts` - Detects selections, renders floating quick-action buttons/picker, builds deep links, sends messages to background.
- `src/background.ts` - Service worker that opens provider tabs on request from the content script.
- `src/options/main.tsx` - React entry for the options page UI and state wiring.
- `src/options/OptionsPage.tsx` - Main options page component with provider checkboxes and affordance mode controls.
- `src/options/options.css` - Styling for the options page using tokens.
- `src/content.css` - Styling for in-page affordances and picker.
- `vite.config.ts` - Build output configuration for content script, background, and options page bundles.
- `public/options.html` - Options page HTML shell referencing the built bundle.

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.

## Instructions for Completing Tasks

IMPORTANT: As you complete each task, you must check it off in this markdown file by changing `- [ ]` to `- [x]`. This helps track progress and ensures you don't skip any steps.

Example:
- `- [ ] 1.1 Read file` → `- [x] 1.1 Read file` (after completing)

## Tasks

- [x] 0.0 Create feature branch
- [x] 1.0 Establish MV3 project structure and tooling (Vite + React options page)
  - [x] 1.1 Initialize project structure for MV3 extension (src/, public/, dist/) and confirm gitignore covers build artifacts.
  - [x] 1.2 Add Vite config to output content script, background, and options page bundles (no inline scripts, CSP-safe).
  - [x] 1.3 Add basic manifest.json scaffold with permissions (`storage`, `scripting`, `tabs`, `activeTab`), host permissions `<all_urls>`, content_scripts, background, options_page entries.
  - [x] 1.4 Add options.html shell pointing to the built options bundle.

- [x] 2.0 Implement content script for selection detection, floating quick actions, and picker
  - [x] 2.1 Implement selection detection on `mouseup`/`keyup`; ignore empty/whitespace and `input`/`textarea`/`contenteditable=true` selections.
  - [x] 2.2 Compute selection rectangle (`Range.getBoundingClientRect()`) and render floating quick-action UI near selection with fade-in and keyboard focusability.
  - [x] 2.3 Implement quick-action logic: default two buttons ordered (1) Ask ChatGPT, (2) Google Search; honor checkbox-configured providers (ChatGPT/Google/Claude).
  - [x] 2.4 Add provider picker variant and toggle based on settings; close on outside click/escape/scroll/deselect.
  - [x] 2.5 Build deep links per provider using `encodeURIComponent(selectedText)`; message background to open tab; handle errors gracefully.
  - [x] 2.6 Add cleanup/disposal on selection clear, navigation, or script unload; ensure namespace/shadow to avoid style collisions.
  - [x] 2.7 Wire content script to read settings from `chrome.storage.sync` with sane defaults (ChatGPT+Google on, Claude off; extension enabled).

- [x] 3.0 Implement background/service worker messaging to open provider tabs
  - [x] 3.1 Add message listener for open-tab requests from content script; validate URL.
  - [x] 3.2 Open tabs via `chrome.tabs.create({ url })`; handle errors with console logging, no page breakage.
  - [x] 3.3 (Optional) Namespace message types for future extensibility.

- [x] 4.0 Build options page with provider checkboxes, affordance mode, and storage sync
  - [x] 4.1 Create React options page structure (main entry + OptionsPage component) with three provider checkboxes (ChatGPT, Google, Claude) defaulting to ChatGPT+Google checked.
  - [x] 4.2 Add toggle for extension enabled/disabled and affordance mode (quick actions vs picker).
  - [x] 4.3 Load settings from `chrome.storage.sync` on mount; populate UI with defaults if missing.
  - [x] 4.4 Persist changes to `chrome.storage.sync` on user interaction with debounced/throttled writes.
  - [x] 4.5 Validate basic states (e.g., prevent zero providers? or allow; document choice) and provide minimal user feedback.

- [x] 5.0 Apply baseline styling tokens and scoped CSS for content and options UIs
  - [x] 5.1 Define CSS tokens in `:root` (`--space-*`, `--font-size-*`, `--radius-*`, `--color-*`).
  - [x] 5.2 Style floating quick actions/picker with minimal, neutral UI; ensure readability and focus outline.
  - [x] 5.3 Style options page with semantic class names and layout using tokens; keep barebones, CSP-safe.
  - [x] 5.4 Namespace styles or use Shadow DOM to avoid host-page collisions for content script UI.

- [ ] 6.0 Package, test, and QA the extension build
  - [x] 6.1 Build extension bundles via Vite; verify output structure (`dist/` with manifest, scripts, options assets).
  - [ ] 6.2 Load unpacked extension in Chrome; smoke test selection flow: buttons appear in order (ChatGPT, Google), Claude appears only if enabled.
  - [ ] 6.3 Verify picker mode, enable/disable toggle, and settings persistence across sessions (`chrome.storage.sync`).
  - [ ] 6.4 Verify performance target (~100ms) and disappearance triggers (deselect, scroll, outside click, Escape).
  - [ ] 6.5 Log any errors and ensure graceful degradation if storage/messages fail.
