# Product Requirements Document  
## Project: Select-to-Search Chrome Extension

## 1. Problem & Vision

Users frequently want instant context on text they encounter on the web. They should be able to:

- Select text.
- Click a small UI affordance.
- Choose where to send it:
  - Google Search.
  - ChatGPT.
  - Claude.

The result should open in the provider’s own UI using the user’s logged in session. There should be no API keys, no backend, and very low friction.

The extension should be fast, lightweight, and have a clean, well designed settings page suitable for future growth to more AI providers.

---

## 2. In Scope (MVP)

- Chrome extension using Manifest V3.
- Content script that:
  - Detects text selection on arbitrary websites.
  - Shows a floating button near the selection.
  - On click, opens a provider picker or directly opens a default provider.
- Providers supported in v1:
  - Google Search via deep link.
  - ChatGPT via deep link.
  - Claude via deep link.
- Settings (options) page with a nice UI built using React and Vite:
  - Choose default provider (Google, ChatGPT, Claude).
  - Turn the extension on or off.
  - Choose click behavior (direct to default provider vs show provider picker).
  - Optional prompt prefix template that is prepended to the selected text.

---

## 3. Out of Scope (MVP)

- Any API usage that requires user API keys.
- Displaying AI answers inside the extension’s own UI.
- Gemini integration beyond future design considerations.
- Multi turn context management or advanced model configuration.
- Per site configuration and advanced permissions.

---

## 4. User Stories

1. **Text selection to provider**

   - As a user, when I select text on any webpage, I see a small floating button appear near the selection.
   - When I click this button, I can send that text to a provider such as Google Search, ChatGPT, or Claude.

2. **Default provider**

   - As a user, I can pick a default provider in the settings page.
   - When I click the floating button:
     - If I choose “direct” behavior, it immediately opens a new tab to my default provider with the selected text.
     - If I choose “picker” behavior, I see a provider picker and select where to send it.

3. **Provider picker**

   - As a user, when the provider picker is shown, I see:
     - “Google search”
     - “Ask ChatGPT”
     - “Ask Claude”
   - Clicking one opens a new tab with the appropriate deep link and prefilled query.

4. **Non intrusive UI**

   - As a user, the floating button disappears automatically when I clear the selection, scroll, or click elsewhere.
   - The extension does not interfere with normal usage of the page or text editors.

5. **Settings page**

   - As a user, I can open a visually clean settings page where I:
     - Enable or disable the extension.
     - Choose default provider.
     - Choose behavior on click (direct vs provider picker).
     - Optionally specify a prefix template like “Explain this briefly: ” that is applied before sending text.

---

## 5. UX & Interaction Requirements

### 5.1 Selection detection

- Trigger on `mouseup` and `keyup`.
- Use `window.getSelection()` to read the selected text.
- If there is no text or only whitespace, do nothing.
- Ignore selections inside:
  - `input`, `textarea`.
  - Elements with `contenteditable=true` in MVP to avoid conflicts with editors.

### 5.2 Floating button

- Appears when there is a non empty selection and no existing button for that selection.
- Position:
  - Compute the selection bounding rectangle via `Range.getBoundingClientRect()`.
  - Place the button near the top right or bottom right of the selection with a small offset so it does not fully cover the selected text.
- Visual guidelines:
  - Small circular or pill button.
  - Neutral background with subtle shadow and a short label such as “AI” or an icon.
- Behavior:
  - Fade in when created.
  - Disappear when:
    - Selection becomes empty.
    - User scrolls beyond a small threshold from the original position.
    - User clicks outside the selection and floating UI.
    - User presses Escape.
- Accessibility:
  - Button is focusable with keyboard.
  - Optional keyboard shortcut (later) that sends the current selection to the default provider.

### 5.3 Provider picker

- Trigger:
  - If settings are “always show provider picker”, clicking the floating button opens a small inline menu near the button.
  - If settings are “direct to default provider”, clicking the floating button skips the picker and opens the default provider immediately.
- Layout:
  - Compact vertical or small card style menu.
  - Three options in MVP:
    - Google search
    - Ask ChatGPT
    - Ask Claude
  - Each option is clearly labeled and clickable.
- Interaction:
  - Clicking an option builds the deep link URL and opens a new tab.
  - Clicking outside the picker closes it.

---

## 6. Deep Link Behavior

For all providers:

1. Construct the final prompt string:
   - Let `selectedText` be the raw selected text.
   - Let `prefix` be an optional string from settings.
   - If `prefix` is non empty, build `finalPrompt = prefix + selectedText`.
   - Otherwise, `finalPrompt = selectedText`.

2. URL encode `finalPrompt` with `encodeURIComponent`.

3. Deep link per provider:

   - **Google Search**  
     - Base: `https://www.google.com/search`  
     - Query parameter: `q=<encoded_finalPrompt>`  
     - Result URL example:  
       `https://www.google.com/search?q=Explain%20combat%20gameplay`

   - **ChatGPT**  
     - Base: `https://chatgpt.com/`  
     - Query parameter: `q=<encoded_finalPrompt>`  
     - Result URL example:  
       `https://chatgpt.com/?q=Explain%20combat%20gameplay`

   - **Claude**  
     - Base: `https://claude.ai/new`  
     - Query parameter: `q=<encoded_finalPrompt>`  
     - Result URL example:  
       `https://claude.ai/new?q=Explain%20combat%20gameplay`

If the user is not logged in to ChatGPT or Claude, those sites will show their own sign in flows. The extension does not manage login or authentication state.

---

## 7. Functional Requirements

### 7.1 Content script

Responsibilities:

- Run on `<all_urls>` except Chrome restricted URLs.
- Detect text selection and manage floating button lifecycle.
- Render:
  - The floating button.
  - The inline provider picker UI when required.
- Read settings from `chrome.storage`:
  - extension enabled flag.
  - default provider.
  - click behavior.
  - optional prefix string.
- On provider selection:
  - Build the final prompt string.
  - Build the deep link for the chosen provider.
  - Request the background script to open a new tab with the given URL, or open directly via `chrome.tabs.create` if allowed in context.

Implementation notes:

- Use plain JavaScript or TypeScript without heavy frameworks in the content script.
- Use CSS that is namespaced to avoid clashes. Shadow DOM is preferred if feasible.

### 7.2 Background / service worker

Responsibilities:

- Receive messages from the content script requesting a new tab to be opened.
- Open new tab using `chrome.tabs.create({ url })`.
- Potentially handle future features like logging or different behavior per provider.

### 7.3 Options page (settings UI)

Responsibilities:

- Provide a visually clean settings page where users can:
  - Toggle extension enabled / disabled.
  - Select default provider from:
    - Google search
    - ChatGPT
    - Claude
  - Select click behavior:
    - “Direct to default provider”
    - “Always show provider picker”
  - Enter or edit prefix text that is prepended to the selected text.

Implementation stack and structure:

- Built as a small single page application using **React + Vite**.
- The React app is compiled to a single static JavaScript bundle that runs entirely client side.
- No Next.js and no server side rendering. This is a pure static frontend.

Details:

- `options.html`:
  - Contains the root element `<div id="root"></div>`.
  - References the compiled script `options.js` without inline scripts.
- React entry point:
  - `src/options/main.tsx` (or `.tsx` or `.jsx`).
  - Renders `<OptionsPage />` into the `root` element.
- Vite config:
  - Build target is Chrome’s supported ES level.
  - Output is configured so that `options.html` and `options.js` sit in the extension `dist` folder.
  - Ensure CSP compliance by not inlining scripts or using eval.

Options page behavior:

- On load, read settings from `chrome.storage.sync` or `chrome.storage.local`.
- Populate UI controls with current values.
- On change, update settings in storage.
- Provide basic validation and feedback when needed.

---

## 8. Technical Details

### 8.1 Manifest V3

- `manifest_version`: 3
- Key fields:
  - `name`, `version`, `description`.
  - `permissions`:  
    - `"storage"`  
    - `"scripting"`  
    - `"tabs"`  
    - `"activeTab"`
  - `host_permissions`:  
    - `"<all_urls>"`
  - `background`:
    - Service worker script entry, for example `background.js`.
  - `content_scripts`:
    - Match patterns: `["<all_urls>"]`
    - JS entry: `contentScript.js`
  - `options_page`: `"options.html"`

### 8.2 Build pipeline

- Use Vite with React for the options page only.
- Content script and background script can be plain JS/TS bundled by the same Vite build or separate tooling.
- No Next.js and no Node server. The entire extension is static assets.

Target structure (example):

- `src/`
  - `contentScript.ts`
  - `background.ts`
  - `options/`
    - `main.tsx`
    - `OptionsPage.tsx`
    - `components/…`
- `public/`
  - `options.html`
  - icons
- `dist/`
  - Built extension files ready for packing.

---

## 9. Performance and UX Constraints

- Floating button should appear within about 100 milliseconds after mouseup under normal conditions.
- Content script must not introduce noticeable lag to page interactions.
- Options page should load quickly and remain responsive on modest hardware.
- Error handling:
  - If `chrome.tabs.create` or messaging fails, log errors to the console but do not break the host page.
  - The extension should fail gracefully if storage is unavailable or corrupted.

---

## 10. Future Phases

### 10.1 Prompt shaping with a “cheap” model

- Add an optional middle layer that:
  - Takes the selected text and basic context (page title, URL).
  - Uses a fast and inexpensive LLM (on the developer’s backend or another service) to generate a refined question.
  - Example:
    - Input: `"combat gameplay"`
    - Output: `"Explain the concept of combat gameplay in video games with clear examples."`
- The refined question is then used as `finalPrompt` for all providers.
- This requires:
  - Optional backend API endpoint.
  - Additional settings switch such as “Use smart question generation”.

### 10.2 Gemini and additional providers

- When Gemini or other providers support URL based initiation with a query:
  - Add them as additional providers.
  - Extend the provider picker and settings UI.
- Until a documented pattern exists, Gemini can be a simple “open site and copy text to clipboard” fallback.

### 10.3 API based responses in extension UI

- Add a separate mode where:
  - The extension calls provider APIs directly and shows responses in a popup.
  - Requires user provided API keys or the developer’s backend key management.
- This is outside the MVP and should be designed later with attention to privacy, rate limits, and cost.

---