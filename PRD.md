# Product Requirements Document
## Project: Select-to-Search Chrome Extension

1. Introduction/Overview
- Enable users to select text on any webpage and instantly open it in a provider (Google Search, ChatGPT, Claude) using lightweight in-page UI. Two quick-action buttons (Google Search, Ask ChatGPT) should appear by default so the user can choose either without extra clicks. No backend, no API keys; rely on provider UIs with the user’s existing sessions.

2. Goals
- Deliver a fast, non-intrusive selection workflow (button render target ≤100ms after mouseup) that reliably opens provider tabs.
- Provide dual quick actions (Google + ChatGPT) by default, with optional picker to reach all providers including Claude.
- Offer a simple settings page to toggle the extension, manage behavior, and edit a prompt prefix, syncing across the user’s Chrome profiles.
- Keep the codebase lean (Manifest V3, minimal styling) and ready for future providers/design polish.

3. User Stories
- As a user, when I select text on any webpage, two small floating buttons (Google Search, Ask ChatGPT) appear near the selection; clicking one opens a new tab in that provider with my text.
- As a user, I can enable/disable the extension and choose whether the floating affordance shows quick actions or a provider picker with all providers (including Claude) via settings.
- As a user, I can set an optional prefix (e.g., “Explain this briefly: ”) that prepends to my selected text before sending.
- As a user, the floating UI disappears when I clear the selection, scroll away, press Escape, or click elsewhere, and it never interferes with normal page input fields or editors.

4. Functional Requirements
- FR1 Selection detection: Listen on `mouseup` and `keyup`; use `window.getSelection()`; ignore empty/whitespace selections and selections inside `input`, `textarea`, or `contenteditable=true` elements (MVP).
- FR2 Floating affordance: When valid selection exists, render a small, lightly styled floating UI near the selection rectangle (`Range.getBoundingClientRect()`), offset so it does not cover text; fade in on create and hide on deselect, scroll threshold, outside click, or Escape. Must be keyboard-focusable.
- FR3 Quick actions: Default state shows two buttons side-by-side: “Google Search” and “Ask ChatGPT”. Clicking opens provider tabs via deep links. Settings can switch to a compact provider picker that includes all providers (Google, ChatGPT, Claude) instead of dual buttons.
- FR4 Deep links: Build `finalPrompt` by prepending optional prefix to selected text; URL encode with `encodeURIComponent`; open provider URLs:
  - Google: `https://www.google.com/search?q=<encoded_finalPrompt>`
  - ChatGPT: `https://chatgpt.com/?q=<encoded_finalPrompt>`
  - Claude: `https://claude.ai/new?q=<encoded_finalPrompt>`
- FR5 Settings (options page): React + Vite single-page options UI that lets users: (a) enable/disable extension, (b) choose affordance mode (dual quick actions vs picker), (c) choose default provider for any “direct” behavior if introduced, (d) edit optional prefix. Persist via `chrome.storage.sync`; load on start and reflect current values.
- FR6 Background/service worker: Receive messages from content script and open new tabs via `chrome.tabs.create({ url })`. Handle future provider-specific behaviors gracefully.
- FR7 Storage handling: Use `chrome.storage.sync`; guard against missing/corrupt values with sane defaults (extension enabled, dual quick actions on, prefix empty).
- FR8 Styling baseline: Barebones CSS with semantic class names; define tokens in `:root` (`--space-*`, `--font-size-*`, `--radius-*`, `--color-*`). Keep separate stylesheets: `content.css` for in-page UI, `options.css` for settings.
- FR9 Performance: Floating UI should appear within ~100ms after mouseup under normal conditions; content script must avoid noticeable page lag. Log errors without breaking host pages.
- FR10 Accessibility & cleanup: Button/picker focusable via keyboard; dismiss on Escape. Ensure cleanup when navigating away or when selection changes.
- FR11 Build/output: Manifest V3 extension; options built with Vite targeting Chrome; output `options.html` + bundled `options.js` in `dist`; no inline scripts/eval.

5. Non-Goals (Out of Scope)
- No API-key-based calls or in-extension answer rendering in MVP.
- No backend or server components; no advanced per-site permissions.
- No multi-turn context management or Gemini integration beyond future consideration.
- No complex theming; only foundational tokens and minimal styling in v1.

6. Design Considerations (Optional)
- Keep layout simple (system font stack, minimal borders/shadows) while using semantic structure for future theming. Small pill or circular buttons for quick actions. Picker as compact vertical menu near the affordance.
- Use namespaced classes or Shadow DOM to avoid host-page style clashes.

7. Technical Considerations (Optional)
- Manifest V3 with permissions: `storage`, `scripting`, `tabs`, `activeTab`; host permissions `<all_urls>`; `content_scripts` entry for selection handling; `background` service worker; `options_page` defined.
- Content script and background can be plain JS/TS; options page uses React + Vite. Ensure CSP compliance (no inline scripts).
- Consider a light namespace for messages between content and background.

8. Success Metrics
- Usage-focused, locally derivable signals (no backend assumed):
  - U1: Count of floating affordance impressions (valid selections) and actions by provider (Google, ChatGPT, Claude) per device/profile.
  - U2: Ratio of affordance impressions that lead to an action (click-through rate).
  - U3: Settings persistence health (load success vs fallback to defaults) per session.
- Optional (requires external endpoint/opt-in, not in MVP): uninstall URL ping or remote telemetry to measure drop-off/uninstalls.

9. Open Questions
- Should Claude also appear as a third quick-action button, or remain accessible only via the picker mode?
- Is remote telemetry allowed later to track uninstalls/drop-off, or must metrics remain device-local only?
- For “direct” behavior, should we keep a default provider setting, or rely solely on dual quick actions in v1?
